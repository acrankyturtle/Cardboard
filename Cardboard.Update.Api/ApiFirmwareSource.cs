using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Cardboard.Device;
using Cardboard.Update.Api.Abstractions;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

file class ApiFirmwareSource(HttpClient httpClient, IOptions<UpdateSourceConfiguration> options)
	: IFirmwareSource
{
	public async Task<uint?> GetLatestVersion(
		DeviceTypeId deviceType,
		uint? variant,
		CancellationToken cancellationToken = default
	)
	{
		var url = GetFirmwareUrl(null, deviceType, variant, null, options.Value.Channel);
		var response = await httpClient.GetAsync(url, cancellationToken);

		if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
			return null;

		response.EnsureSuccessStatusCode();

		return (
			await response.Content.ReadFromJsonAsync<FirmwareVersionResponse>(cancellationToken)
			?? throw new JsonException()
		).Version;
	}

	public async Task<DeviceFirmware?> GetFirmware(
		DeviceTypeId deviceType,
		uint? variant,
		uint version,
		CancellationToken cancellationToken = default
	)
	{
		// First, get the version info which includes the expected hash
		var versionUrl = GetFirmwareUrl(null, deviceType, variant, version, options.Value.Channel);

		var versionResponse = await httpClient.GetAsync(versionUrl, cancellationToken);

		if (versionResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
			return null;

		versionResponse.EnsureSuccessStatusCode();

		var versionInfo =
			await versionResponse.Content.ReadFromJsonAsync<FirmwareVersionResponse>(cancellationToken)
			?? throw new JsonException("Failed to parse firmware version response");

		// Download the firmware
		var downloadUrl = GetFirmwareUrl("download", deviceType, variant, version, options.Value.Channel);

		var downloadResponse = await httpClient.GetAsync(downloadUrl, cancellationToken);

		if (downloadResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
			return null;

		downloadResponse.EnsureSuccessStatusCode();

		var firmwareBytes = await downloadResponse.Content.ReadAsByteArrayAsync(cancellationToken);

		// Verify the hash
		var actualHash = Convert.ToHexString(SHA256.HashData(firmwareBytes)).ToLowerInvariant();
		if (!string.Equals(actualHash, versionInfo.Sha256, StringComparison.OrdinalIgnoreCase))
		{
			throw new FirmwareIntegrityException(
				$"Firmware hash mismatch. Expected: {versionInfo.Sha256}, Actual: {actualHash}"
			);
		}

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
		uint? variant,
		uint? version,
		UpdateChannel channel
	)
	{
		var url =
			$"{options.Value.Url}/firmware/{deviceType}/{(version is { } v ? v.ToString() : "latest")}/{action}";
		var queryParams = new Dictionary<string, string?>
		{
			["variant"] = variant?.ToString(),
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
