using System.Net.Http.Json;
using System.Text.Json;
using Cardboard.Device;
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
			await response.Content.ReadFromJsonAsync<FirmwareInfoResponse>(cancellationToken)
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
		var url = GetFirmwareUrl("download", deviceType, variant, version, options.Value.Channel);
		var response = await httpClient.GetAsync(url, cancellationToken);

		if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
			return null;

		response.EnsureSuccessStatusCode();

		var firmwareBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

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

file class UpdateSourceConfiguration
{
	public string Url { get; init; } = "https://cardboard.ggbim.com/update";

	public UpdateChannel Channel { get; init; } = UpdateChannel.Stable;
}

[Flags]
public enum UpdateChannel
{
	Stable = 1,
	Preview = 2,
	All = ~0,
}

public sealed class FirmwareInfoResponse
{
	public required uint Version { get; init; }
	public required bool IsPreview { get; init; }
}
