using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

file sealed class ApiDeviceIconSource(
	HttpClient httpClient,
	IOptions<UpdateSourceConfiguration> options,
	IOptions<DeviceIconCacheConfiguration> cacheOptions,
	ILogger<ApiDeviceIconSource> logger
) : IDeviceIconSource
{
	public async Task<DeviceIcon?> GetIcon(string fileName, CancellationToken cancellationToken)
	{
		var sanitized = Path.GetFileName(fileName);

		// try disk cache first
		var cached = LoadFromDiskCache(sanitized);
		if (cached is not null)
			return cached;

		// fetch from API
		try
		{
			var url = $"{options.Value.Url}/device-icons/{sanitized}";
			logger.LogDebug("Fetching device icon from {Url}", url);

			var response = await httpClient.GetAsync(url, cancellationToken);

			if (!response.IsSuccessStatusCode)
			{
				logger.LogWarning(
					"Failed to fetch device icon {FileName}: {StatusCode}",
					sanitized,
					response.StatusCode
				);
				return null;
			}

			var data = await response.Content.ReadAsByteArrayAsync(cancellationToken);
			var contentType = GetContentType(sanitized);
			var icon = new DeviceIcon(data, contentType);

			SaveToDiskCache(sanitized, data);

			return icon;
		}
		catch (Exception ex) when (ex is not OperationCanceledException)
		{
			logger.LogWarning(ex, "Failed to fetch device icon {FileName}", sanitized);
			return null;
		}
	}

	private DeviceIcon? LoadFromDiskCache(string fileName)
	{
		var cachePath = GetCachePath();
		if (cachePath is null)
			return null;

		var filePath = Path.Combine(cachePath, fileName);

		if (!File.Exists(filePath))
			return null;

		try
		{
			var data = File.ReadAllBytes(filePath);
			logger.LogDebug("Loaded device icon {FileName} from disk cache", fileName);
			return new DeviceIcon(data, GetContentType(fileName));
		}
		catch (Exception ex)
		{
			logger.LogWarning(ex, "Failed to load device icon {FileName} from disk cache", fileName);
			return null;
		}
	}

	private void SaveToDiskCache(string fileName, byte[] data)
	{
		var cachePath = GetCachePath();
		if (cachePath is null)
			return;

		try
		{
			Directory.CreateDirectory(cachePath);
			var filePath = Path.Combine(cachePath, fileName);
			File.WriteAllBytes(filePath, data);
			logger.LogDebug("Saved device icon {FileName} to disk cache at {Path}", fileName, filePath);
		}
		catch (Exception ex)
		{
			logger.LogWarning(ex, "Failed to save device icon {FileName} to disk cache", fileName);
		}
	}

	private string? GetCachePath() =>
		!string.IsNullOrEmpty(cacheOptions.Value.IconCache)
			? Environment.ExpandEnvironmentVariables(cacheOptions.Value.IconCache)
			: null;

	private static string GetContentType(string fileName) =>
		Path.GetExtension(fileName).ToLowerInvariant() switch
		{
			".svg" => "image/svg+xml",
			".png" => "image/png",
			_ => "application/octet-stream",
		};
}

public class DeviceIconCacheConfiguration
{
	public string? IconCache { get; init; }
}

partial class Services
{
	public static IServiceCollection AddApiDeviceIconSource(
		this IServiceCollection services,
		IConfigurationSection configuration
	)
	{
		services.AddSingleton<IDeviceIconSource, ApiDeviceIconSource>();
		services.AddHttpClient<ApiDeviceIconSource>(
			(sp, client) =>
			{
				var config = sp.GetRequiredService<IOptions<UpdateSourceConfiguration>>();
				client.BaseAddress = new(config.Value.Url);
				client.Timeout = TimeSpan.FromSeconds(30);
			}
		);
		services.Configure<DeviceIconCacheConfiguration>(configuration);
		return services;
	}
}
