using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

file sealed class ApiDeviceIconSource(
	IHttpClientFactory httpClientFactory,
	IOptions<UpdateSourceConfiguration> options,
	IOptions<DeviceIconCacheConfiguration> cacheOptions,
	IOptions<CacheTimings> cacheTimingOptions,
	ILogger<ApiDeviceIconSource> logger
) : IDeviceIconSource, IClearMemoryCache, IClearDiskCache
{
	private readonly IApiCache<string, DeviceIcon> _cache = DiskBasedApiCache.Create<string, DeviceIcon>(
		cacheTimingOptions.Value,
		async (fileName, ct) =>
		{
			var client = httpClientFactory.CreateClient(nameof(ApiDeviceIconSource));
			var url = $"{options.Value.Url}/device-icons/{fileName}";
			logger.LogDebug("Fetching device icon from {Url}", url);

			var response = await client.GetAsync(url, ct);
			response.EnsureSuccessStatusCode();

			var data = await response.Content.ReadAsByteArrayAsync(ct);
			return new(data, GetContentType(fileName));
		},
		cacheOptions.Value.IconCache,
		cacheOptions.Value.IconCacheManifest,
		DeviceIconCacheHelper.HashFileName,
		async (_, v, stream) =>
		{
			await stream.WriteAsync(v.Data);
		},
		async (k, stream, ct) =>
		{
			var data = new byte[stream.Length];
			await stream.ReadExactlyAsync(data, ct);
			return new(data, GetContentType(k));
		},
		logger
	);

	public async Task<DeviceIcon?> GetIcon(string fileName, CancellationToken cancellationToken)
	{
		var sanitized = Path.GetFileName(fileName);
		return await _cache.GetAsync(sanitized, cancellationToken);
	}

	private static string GetContentType(string fileName) =>
		Path.GetExtension(fileName).ToLowerInvariant() switch
		{
			".svg" => "image/svg+xml",
			".png" => "image/png",
			_ => "application/octet-stream",
		};

	public void ClearMemoryCache()
	{
		_cache.Clear();
	}

	public async Task ClearDiskCache()
	{
		await _cache.ClearFallback();
	}
}

internal static class DeviceIconCacheHelper
{
	/// <summary>
	/// Hashes a file name using SHA-256 to produce a flat, URL-safe cache key.
	/// </summary>
	public static string HashFileName(string key)
	{
		const int hashSize = 32;
		const int base64Size = 44; // Base64-encoded 32 bytes is always 44 characters

		var byteCount = Encoding.UTF8.GetByteCount(key);
		Span<byte> buffer = stackalloc byte[byteCount];
		Encoding.UTF8.GetBytes(key, buffer);
		Span<byte> hash = stackalloc byte[hashSize];
		SHA256.HashData(buffer, hash);
		Span<char> base64Hash = stackalloc char[base64Size];
		Convert.TryToBase64Chars(hash, base64Hash, out _);
		base64Hash.Replace('/', '_');

		// omit padding character
		var fileName = new string(base64Hash[..^1]);
		return fileName;
	}
}

public class DeviceIconCacheConfiguration
{
	public string? IconCache { get; init; }
	public string? IconCacheManifest { get; init; }
}

partial class Services
{
	public static IServiceCollection AddApiDeviceIconSource(
		this IServiceCollection services,
		IConfigurationSection configuration
	)
	{
		services.AddSingleton<ApiDeviceIconSource>();
		services.AddSingleton<IDeviceIconSource>(sp => sp.GetRequiredService<ApiDeviceIconSource>());
		services.AddSingleton<IClearMemoryCache>(sp => sp.GetRequiredService<ApiDeviceIconSource>());
		services.AddSingleton<IClearDiskCache>(sp => sp.GetRequiredService<ApiDeviceIconSource>());
		services.AddHttpClient(
			nameof(ApiDeviceIconSource),
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
