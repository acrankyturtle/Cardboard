using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Cardboard.Device;
using Cardboard.Update.Api.Abstractions;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

internal class ApiFirmwareSource(
	IHttpClientFactory httpClientFactory,
	IOptions<UpdateSourceConfiguration> options,
	IOptions<CacheTimings> cacheTimingOptions,
	ILogger<ApiFirmwareSource> logger
) : IFirmwareSource, IClearMemoryCache
{
	private readonly ApiCache<(DeviceTypeId, string?), Version> _versionCache = new(
		cacheTimingOptions.Value,
		async (key, ct) =>
		{
			var (deviceType, variant) = key;
			var client = httpClientFactory.CreateClient(nameof(ApiFirmwareSource));
			var url = GetFirmwareUrl(
				options.Value.Url,
				null,
				deviceType,
				variant,
				null,
				options.Value.Channel
			);
			logger.LogDebug("Fetching latest firmware version from {Url}", url);

			var response = await client.GetAsync(url, ct);
			response.EnsureSuccessStatusCode();

			var version = (
				await response.Content.ReadFromJsonAsync<FirmwareVersionResponse>(ct)
				?? throw new JsonException()
			).Version;
			return version;
		},
		logger
	);

	private readonly ApiCache<IReadOnlyCollection<DeviceFirmwareListEntry>> _listCache = new(
		cacheTimingOptions.Value,
		async ct =>
		{
			var client = httpClientFactory.CreateClient(nameof(ApiFirmwareSource));
			var baseUrl = $"{options.Value.Url}/firmware";
			var queryParams = new Dictionary<string, string?>
			{
				["channel"] = options.Value.Channel.HasFlag(UpdateChannel.Preview) ? "preview" : "stable",
			};
			var url = QueryHelpers.AddQueryString(baseUrl, queryParams);

			logger.LogDebug("Fetching firmware list from {Url}", url);

			var response = await client.GetFromJsonAsync<FirmwareListResponse>(url, ct);
			if (response is null)
				return [];

			return response
				.Entries.Select(e => new DeviceFirmwareListEntry
				{
					DeviceTypeId = DeviceTypeId.Parse(e.DeviceTypeId),
					Variant = e.Variant,
					LatestVersion = e.LatestVersion,
				})
				.ToList();
		},
		logger,
		name: "FirmwareList"
	);

	public async Task<Version?> GetLatestVersion(
		DeviceTypeId deviceType,
		string? variant,
		CancellationToken cancellationToken = default
	) => await _versionCache.GetAsync((deviceType, variant), cancellationToken);

	public async Task<IReadOnlyCollection<DeviceFirmwareListEntry>> GetFirmwareList(
		CancellationToken cancellationToken = default
	) => await _listCache.GetAsync(cancellationToken) ?? [];

	public async Task<DeviceFirmware?> GetFirmware(
		DeviceTypeId deviceType,
		string? variant,
		Version version,
		CancellationToken cancellationToken = default
	)
	{
		var client = httpClientFactory.CreateClient(nameof(ApiFirmwareSource));

		logger.LogInformation(
			"Downloading firmware for device {DeviceType}, version {Version}, variant {Variant}",
			deviceType,
			version,
			variant
		);

		// First, get the version info which includes the expected hash
		var versionUrl = GetFirmwareUrl(
			options.Value.Url,
			null,
			deviceType,
			variant,
			version,
			options.Value.Channel
		);
		logger.LogDebug("Fetching firmware metadata from {Url}", versionUrl);

		var versionResponse = await client.GetAsync(versionUrl, cancellationToken);

		if (versionResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
		{
			logger.LogWarning(
				"Firmware version {Version} not found for device {DeviceType}",
				version,
				deviceType
			);
			return null;
		}

		versionResponse.EnsureSuccessStatusCode();

		var versionInfo =
			await versionResponse.Content.ReadFromJsonAsync<FirmwareVersionResponse>(cancellationToken)
			?? throw new JsonException("Failed to parse firmware version response");

		// Download the firmware
		var downloadUrl = GetFirmwareUrl(
			options.Value.Url,
			"download",
			deviceType,
			variant,
			version,
			options.Value.Channel
		);
		logger.LogDebug("Downloading firmware binary from {Url}", downloadUrl);

		var downloadResponse = await client.GetAsync(downloadUrl, cancellationToken);

		if (downloadResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
		{
			logger.LogWarning("Firmware binary not found at {Url}", downloadUrl);
			return null;
		}

		downloadResponse.EnsureSuccessStatusCode();

		var firmwareBytes = await downloadResponse.Content.ReadAsByteArrayAsync(cancellationToken);
		logger.LogDebug("Downloaded {Size} bytes of firmware", firmwareBytes.Length);

		// Verify the hash
		var actualHash = Convert.ToHexString(SHA256.HashData(firmwareBytes)).ToLowerInvariant();
		if (!string.Equals(actualHash, versionInfo.Sha256, StringComparison.OrdinalIgnoreCase))
		{
			logger.LogError(
				"Firmware integrity check failed! Expected hash: {Expected}, Actual hash: {Actual}",
				versionInfo.Sha256,
				actualHash
			);
			throw new FirmwareIntegrityException(
				$"Firmware hash mismatch. Expected: {versionInfo.Sha256}, Actual: {actualHash}"
			);
		}

		logger.LogInformation(
			"Successfully downloaded and verified firmware v{Version} for {DeviceType} ({Size} bytes)",
			version,
			deviceType,
			firmwareBytes.Length
		);

		return new()
		{
			DeviceType = deviceType,
			Version = version,
			Variant = variant,
			Firmware = firmwareBytes,
		};
	}

	private static string GetFirmwareUrl(
		string baseUrl,
		string? action,
		DeviceTypeId deviceType,
		string? variant,
		Version? version,
		UpdateChannel channel
	)
	{
		var url =
			$"{baseUrl}/firmware/{deviceType}/{(version != null ? version.ToString() : "latest")}/{action}";
		var queryParams = new Dictionary<string, string?>
		{
			["variant"] = variant,
			["channel"] = channel.HasFlag(UpdateChannel.Preview) ? "preview" : "stable",
		};
		return QueryHelpers.AddQueryString(url, queryParams);
	}

	public void ClearMemoryCache()
	{
		_versionCache.Clear();
		_listCache.Clear();
	}
}

partial class Services
{
	public static IServiceCollection AddApiFirmwareSource(
		this IServiceCollection services,
		IConfigurationSection configuration
	)
	{
		services.AddSingleton<ApiFirmwareSource>();
		services.AddSingleton<IFirmwareSource>(sp => sp.GetRequiredService<ApiFirmwareSource>());
		services.AddSingleton<IClearMemoryCache>(sp => sp.GetRequiredService<ApiFirmwareSource>());
		services.AddHttpClient(
			nameof(ApiFirmwareSource),
			(sp, client) =>
			{
				var config = sp.GetRequiredService<IOptions<UpdateSourceConfiguration>>();
				client.BaseAddress = new(config.Value.Url);
				client.Timeout = TimeSpan.FromSeconds(30);
			}
		);
		services.Configure<UpdateSourceConfiguration>(configuration);
		return services;
	}
}
