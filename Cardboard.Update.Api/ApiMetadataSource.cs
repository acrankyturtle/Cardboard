using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Device;
using Cardboard.Metadata;
using Cardboard.Update.Api.Abstractions;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

file sealed class ApiMetadataSource(
	HttpClient httpClient,
	IOptions<UpdateSourceConfiguration> options,
	IOptions<MetadataCacheConfiguration> cacheOptions,
	IOptions<JsonOptions> jsonOptions,
	ILogger<ApiMetadataSource> logger
) : IMetadataSource
{
	private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);
	private static readonly TimeSpan StaleRefreshThreshold = TimeSpan.FromMinutes(30);
	private static readonly TimeSpan NegativeCacheTtl = TimeSpan.FromMinutes(5); // ttl for failures

	private readonly ConcurrentDictionary<DeviceTypeId, CacheEntry<DeviceMetadata?>> _metadataCache = new();
	private CacheEntry<IReadOnlyCollection<MetadataListEntry>>? _listCache;
	private readonly Lock _listCacheLock = new();

	private readonly JsonSerializerOptions _cacheJsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
	};

	private readonly JsonSerializerOptions _updateApiJsonOptions = jsonOptions.Value.SerializerOptions;

	public async Task<DeviceMetadata?> GetMetadata(
		DeviceTypeId deviceTypeId,
		CancellationToken cancellationToken
	)
	{
		// check in-memory cache
		if (_metadataCache.TryGetValue(deviceTypeId, out var cached) && !cached.IsExpired)
		{
			// trigger background refresh if stale
			if (cached.IsStale)
				_ = Task.Run(() => RefreshMetadata(deviceTypeId), CancellationToken.None);

			return cached.Value;
		}

		// try fetching from API
		try
		{
			var metadata = await FetchMetadata(deviceTypeId, cancellationToken);
			CacheMetadata(deviceTypeId, metadata);

			if (metadata is not null)
				await SaveToDiskCache(deviceTypeId, metadata);

			return metadata;
		}
		catch (Exception ex) when (ex is not OperationCanceledException)
		{
			logger.LogWarning(ex, "Failed to fetch metadata for {DeviceTypeId} from API", deviceTypeId);

			// return stale cached value if available
			if (cached is not null)
			{
				logger.LogDebug("Returning stale cached metadata for {DeviceTypeId}", deviceTypeId);
				return cached.Value;
			}

			// try disk cache as fallback
			var diskCached = await LoadFromDiskCache(deviceTypeId);
			if (diskCached is not null)
			{
				logger.LogDebug("Loaded metadata for {DeviceTypeId} from disk cache", deviceTypeId);
				CacheMetadata(deviceTypeId, diskCached);
				return diskCached;
			}

			return null;
		}
	}

	public async Task<IReadOnlyCollection<MetadataListEntry>> GetMetadataList(
		CancellationToken cancellationToken
	)
	{
		CacheEntry<IReadOnlyCollection<MetadataListEntry>>? cached;
		lock (_listCacheLock)
		{
			cached = _listCache;
		}

		if (cached is not null && !cached.IsExpired)
		{
			// trigger background refresh if stale
			if (cached.IsStale)
			{
				_ = Task.Run(
					async () =>
					{
						try
						{
							var list = await FetchMetadataList(CancellationToken.None);
							CacheMetadataList(list);
						}
						catch (Exception ex)
						{
							logger.LogWarning(ex, "Background refresh of metadata list failed");
						}
					},
					CancellationToken.None
				);
			}

			return cached.Value;
		}

		try
		{
			var list = await FetchMetadataList(cancellationToken);
			CacheMetadataList(list);
			return list;
		}
		catch (Exception ex) when (ex is not OperationCanceledException)
		{
			logger.LogWarning(ex, "Failed to fetch metadata list from API");
			return cached is not null ? cached.Value : [];
		}
	}

	private async Task<DeviceMetadata?> FetchMetadata(
		DeviceTypeId deviceTypeId,
		CancellationToken cancellationToken
	)
	{
		var url = $"{options.Value.Url}/metadata/{deviceTypeId}";
		logger.LogDebug("Fetching metadata from {Url}", url);

		var response = await httpClient.GetAsync(url, cancellationToken);

		if (!response.IsSuccessStatusCode)
		{
			logger.LogError(
				"Failed to fetch metadata for {DeviceTypeId}: {StatusCode}",
				deviceTypeId,
				response.StatusCode
			);
			return null;
		}

		var dto = await response.Content.ReadFromJsonAsync<DeviceMetadataResponse>(
			_updateApiJsonOptions,
			cancellationToken
		);
		return dto?.Metadata;
	}

	private async Task<IReadOnlyCollection<MetadataListEntry>> FetchMetadataList(
		CancellationToken cancellationToken
	)
	{
		var url = $"{options.Value.Url}/metadata";
		logger.LogDebug("Fetching metadata list from {Url}", url);

		var response = await httpClient.GetAsync(url, cancellationToken);

		if (!response.IsSuccessStatusCode)
		{
			logger.LogError("Failed to fetch metadata list: {StatusCode}", response.StatusCode);
			return [];
		}

		var dto = await response.Content.ReadFromJsonAsync<MetadataListResponse>(
			_updateApiJsonOptions,
			cancellationToken
		);
		return dto is not null
			? dto
				.Entries.Select(e => new MetadataListEntry
				{
					DeviceTypeId = e.DeviceTypeId,
					Model = e.Model,
					Variants = e.Variants,
				})
				.ToList()
			: [];
	}

	private void CacheMetadata(DeviceTypeId deviceTypeId, DeviceMetadata? metadata)
	{
		var ttl = metadata is not null ? CacheTtl : NegativeCacheTtl;
		var staleThreshold = metadata is not null ? StaleRefreshThreshold : NegativeCacheTtl;

		_metadataCache.AddOrUpdate(
			deviceTypeId,
			_ => new(metadata, ttl, staleThreshold),
			(_, v) => new(metadata ?? v.Value, ttl, staleThreshold)
		);
	}

	private void CacheMetadataList(IReadOnlyCollection<MetadataListEntry> list)
	{
		lock (_listCacheLock)
		{
			_listCache = new(list, CacheTtl, StaleRefreshThreshold);
		}
	}

	private async Task RefreshMetadata(DeviceTypeId deviceTypeId)
	{
		try
		{
			var metadata = await FetchMetadata(deviceTypeId, CancellationToken.None);
			CacheMetadata(deviceTypeId, metadata);
			if (metadata is not null)
				await SaveToDiskCache(deviceTypeId, metadata);
		}
		catch (Exception ex)
		{
			logger.LogWarning(ex, "Background refresh of metadata for {DeviceTypeId} failed", deviceTypeId);
		}
	}

	private async Task SaveToDiskCache(DeviceTypeId deviceTypeId, DeviceMetadata metadata)
	{
		if (string.IsNullOrEmpty(cacheOptions.Value.MetadataCache))
			return;

		try
		{
			var cachePath = Environment.ExpandEnvironmentVariables(cacheOptions.Value.MetadataCache);
			Directory.CreateDirectory(cachePath);

			var filePath = Path.Combine(cachePath, $"{deviceTypeId}.json");
			var json = JsonSerializer.Serialize(metadata, _cacheJsonOptions);
			await File.WriteAllTextAsync(filePath, json);

			logger.LogDebug(
				"Saved metadata for {DeviceTypeId} to disk cache at {Path}",
				deviceTypeId,
				filePath
			);
		}
		catch (Exception ex)
		{
			logger.LogWarning(ex, "Failed to save metadata for {DeviceTypeId} to disk cache", deviceTypeId);
		}
	}

	private async Task<DeviceMetadata?> LoadFromDiskCache(DeviceTypeId deviceTypeId)
	{
		if (string.IsNullOrEmpty(cacheOptions.Value.MetadataCache))
			return null;

		try
		{
			var cachePath = Environment.ExpandEnvironmentVariables(cacheOptions.Value.MetadataCache);
			var filePath = Path.Combine(cachePath, $"{deviceTypeId}.json");

			if (!File.Exists(filePath))
				return null;

			string json;

			try
			{
				json = await File.ReadAllTextAsync(filePath);
			}
			catch (FileNotFoundException)
			{
				logger.LogDebug(
					"Metadata cache file not found for {DeviceTypeId} at {FilePath}",
					deviceTypeId,
					filePath
				);
				return null;
			}

			DeviceMetadataResponse dto;

			try
			{
				dto =
					JsonSerializer.Deserialize<DeviceMetadataResponse>(json, _cacheJsonOptions)
					?? throw new JsonException("Deserialized DTO is null");
			}
			catch (JsonException)
			{
				logger.LogWarning(
					"Failed to deserialize metadata cache for {DeviceTypeId} at {FilePath}",
					deviceTypeId,
					filePath
				);
				return null;
			}

			return dto.Metadata;
		}
		catch (Exception ex)
		{
			logger.LogWarning(ex, "Failed to load metadata for {DeviceTypeId} from disk cache", deviceTypeId);
			return null;
		}
	}

	private sealed class CacheEntry<T>(T value, TimeSpan ttl, TimeSpan staleThreshold)
	{
		private readonly DateTimeOffset _createdAt = DateTimeOffset.UtcNow;

		public T Value => value;
		public bool IsExpired => DateTimeOffset.UtcNow - _createdAt > ttl;
		public bool IsStale => DateTimeOffset.UtcNow - _createdAt > staleThreshold;
	}
}

public class MetadataCacheConfiguration
{
	public string? MetadataCache { get; init; }
}

partial class Services
{
	public static IServiceCollection AddApiMetadataSource(
		this IServiceCollection services,
		IConfigurationSection configuration
	)
	{
		services.AddSingleton<IMetadataSource, ApiMetadataSource>();
		services.AddHttpClient<ApiMetadataSource>(
			(sp, client) =>
			{
				var config = sp.GetRequiredService<IOptions<UpdateSourceConfiguration>>();
				client.BaseAddress = new(config.Value.Url);
				client.Timeout = TimeSpan.FromSeconds(30);
			}
		);
		services.Configure<MetadataCacheConfiguration>(configuration);
		return services;
	}
}
