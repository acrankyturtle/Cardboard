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

file class ApiFirmwareSource(
	HttpClient httpClient,
	IOptions<UpdateSourceConfiguration> options,
	ILogger<ApiFirmwareSource> logger
) : IFirmwareSource
{
	public async Task<Version?> GetLatestVersion(
		DeviceTypeId deviceType,
		string? variant,
		CancellationToken cancellationToken = default
	)
	{
		var url = GetFirmwareUrl(null, deviceType, variant, null, options.Value.Channel);
		logger.LogDebug("Fetching latest firmware version from {Url}", url);

		var response = await httpClient.GetAsync(url, cancellationToken);

		if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
		{
			logger.LogDebug("No firmware found for device type {DeviceType}", deviceType);
			return null;
		}

		response.EnsureSuccessStatusCode();

		var versionStr = (
			await response.Content.ReadFromJsonAsync<FirmwareVersionResponse>(cancellationToken)
			?? throw new JsonException()
		).Version;

		var version = Version.Parse(versionStr);
		logger.LogInformation("Latest firmware version for {DeviceType}: {Version}", deviceType, version);
		return version;
	}

	public async Task<DeviceFirmware?> GetFirmware(
		DeviceTypeId deviceType,
		string? variant,
		Version version,
		CancellationToken cancellationToken = default
	)
	{
		logger.LogInformation(
			"Downloading firmware for device {DeviceType}, version {Version}, variant {Variant}",
			deviceType,
			version,
			variant
		);

		// First, get the version info which includes the expected hash
		var versionUrl = GetFirmwareUrl(null, deviceType, variant, version, options.Value.Channel);
		logger.LogDebug("Fetching firmware metadata from {Url}", versionUrl);

		var versionResponse = await httpClient.GetAsync(versionUrl, cancellationToken);

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
		var downloadUrl = GetFirmwareUrl("download", deviceType, variant, version, options.Value.Channel);
		logger.LogDebug("Downloading firmware binary from {Url}", downloadUrl);

		var downloadResponse = await httpClient.GetAsync(downloadUrl, cancellationToken);

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
			Firmware = firmwareBytes,
		};
	}

	private string GetFirmwareUrl(
		string? action,
		DeviceTypeId deviceType,
		string? variant,
		Version? version,
		UpdateChannel channel
	)
	{
		var url =
			$"{options.Value.Url}/firmware/{deviceType}/{(version is { } v ? v.ToString() : "latest")}/{action}";
		var queryParams = new Dictionary<string, string?>
		{
			["variant"] = variant,
			["channel"] = channel.HasFlag(UpdateChannel.Preview) ? "preview" : "stable",
		};
		return QueryHelpers.AddQueryString(url, queryParams);
	}
}

partial class Services
{
	public static IServiceCollection AddApiFirmwareSource(
		this IServiceCollection services,
		IConfigurationSection configuration
	)
	{
		services
			.AddSingleton<IFirmwareSource, ApiFirmwareSource>()
			.AddHttpClient<ApiFirmwareSource>(
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
