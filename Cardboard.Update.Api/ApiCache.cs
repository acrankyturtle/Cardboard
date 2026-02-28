using System.Collections.Concurrent;
using System.Reactive;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Cardboard.Update.Api;

internal interface IApiCache<in TKey, TValue>
	where TKey : notnull
{
	Task<TValue?> GetAsync(TKey key, CancellationToken cancellationToken = default);
	void Clear();
	Task ClearFallback();
}

internal interface IApiCache<TValue> : IApiCache<Unit, TValue>
{
	Task<TValue?> GetAsync(CancellationToken cancellationToken = default);

	async Task<TValue?> IApiCache<Unit, TValue>.GetAsync(Unit key, CancellationToken cancellationToken) =>
		await GetAsync(cancellationToken);
}

internal class ApiCache<TKey, TValue>(
	CacheTimings timings,
	Func<TKey, CancellationToken, Task<TValue>> fetch,
	ILogger logger,
	string? name = null
) : IApiCache<TKey, TValue>
	where TKey : notnull
{
	protected ILogger Logger => logger;
	protected string Name => name ?? typeof(TValue).Name;

	private readonly ConcurrentDictionary<TKey, CacheEntry<TValue>> _cache = new();

	private readonly ConcurrentDictionary<TKey, NegativeCacheEntry> _negativeCacheEntries = new(); // avoid hitting API too frequently

	private readonly ConcurrentDictionary<TKey, Task> _refreshTasks = new();

	public async Task<TValue?> GetAsync(TKey key, CancellationToken cancellationToken = default)
	{
		// check in-memory cache
		if (_cache.TryGetValue(key, out var cached) && !cached.IsExpired)
			return HandleCacheHit(key, cached);

		// check negative cache
		if (_negativeCacheEntries.TryGetValue(key, out var negativeEntry))
		{
			if (negativeEntry.IsExpired)
				_negativeCacheEntries.TryRemove(key, out _);
			else
			{
				logger.LogDebug("Skipping fetch of {Name} due to negative cache", Name);
				return default;
			}
		}

		// try seeding from fallback (e.g. disk cache)
		try
		{
			var seedValue = await FetchFallback(key, cancellationToken);

			// add as stale
			var createdAt = DateTimeOffset.MinValue;
			_cache.TryAdd(key, new(seedValue, timings.Ttl, timings.StaleRefresh, createdAt));

			var seedEntry = _cache[key];
			return HandleCacheHit(key, seedEntry);
		}
		catch (NotSupportedException)
		{
			// fallback not supported
		}
		catch (Exception fallbackEx) when (fallbackEx is not OperationCanceledException)
		{
			logger.LogInformation(fallbackEx, "Failed to seed {Name} from fallback", Name);
		}

		// fetch
		try
		{
			return await Fetch(key, cancellationToken);
		}
		catch (Exception ex) when (ex is not OperationCanceledException)
		{
			logger.LogWarning(ex, "Failed to fetch {Name} from API", Name);

			// return expired cached value if available
			if (cached is not null)
			{
				logger.LogDebug("Returning expired cached {Name}", Name);
				return cached.Value;
			}

			// try fallback (e.g. disk cache)
			TValue fallback;
			try
			{
				fallback = await FetchFallback(key, cancellationToken);
				logger.LogDebug("Returning fallback {Name}", Name);
			}
			catch (NotSupportedException)
			{
				// fallback not supported
				return default;
			}
			catch (Exception fallbackEx) when (fallbackEx is not OperationCanceledException)
			{
				logger.LogWarning(fallbackEx, "Failed to fetch {Name} from fallback", Name);
				_negativeCacheEntries[key] = new(timings.NegativeTtl);
				return default;
			}

			CacheValue(key, fallback);
			return fallback;
		}
	}

	public void Clear()
	{
		_cache.Clear();
		_negativeCacheEntries.Clear();
	}

	public virtual Task ClearFallback()
	{
		return Task.CompletedTask;
	}

	private async Task<TValue> Fetch(TKey key, CancellationToken cancellationToken)
	{
		var value = await fetch(key, cancellationToken);
		await OnValueFetched(key, value);
		return value;
	}

	protected virtual Task OnValueFetched(TKey key, TValue? value)
	{
		if (value is not null)
			CacheValue(key, value);

		return Task.CompletedTask;
	}

	protected virtual Task<TValue> FetchFallback(TKey key, CancellationToken cancellationToken)
	{
		throw new NotSupportedException();
	}

	private TValue HandleCacheHit(TKey key, CacheEntry<TValue> entry)
	{
		if (entry.IsStale)
		{
			_ = _refreshTasks.GetOrAdd(
				key,
				k =>
					Task.Run(
						async () =>
						{
							try
							{
								_ = await Fetch(k, CancellationToken.None);
							}
							catch (Exception ex)
							{
								logger.LogWarning(ex, "Background refresh of {Name} failed", Name);
							}
							finally
							{
								_refreshTasks.TryRemove(k, out _);
							}
						},
						CancellationToken.None
					)
			);
		}

		return entry.Value;
	}

	private void CacheValue(TKey key, TValue value)
	{
		_cache.AddOrUpdate(
			key,
			_ => new(value, timings.Ttl, timings.StaleRefresh, DateTimeOffset.UtcNow),
			(_, _) => new(value, timings.Ttl, timings.StaleRefresh, DateTimeOffset.UtcNow)
		);
	}
}

internal class DiskBackedApiCache<TKey, TValue>(
	CacheTimings timings,
	Func<TKey, CancellationToken, Task<TValue>> fetch,
	string cachePath,
	string manifestFullFileName,
	Func<TKey, string> getFileName,
	Func<TKey, TValue, Stream, Task> serialize,
	Func<TKey, Stream, CancellationToken, Task<TValue>> deserialize,
	ILogger logger,
	string? name = null
) : ApiCache<TKey, TValue>(timings, fetch, logger, name), IDisposable
	where TKey : notnull
{
	private readonly SemaphoreSlim _semaphore = new(1);

	private string CachePath => Environment.ExpandEnvironmentVariables(cachePath);
	private string ManifestFullFileName => Environment.ExpandEnvironmentVariables(manifestFullFileName);

	public override async Task ClearFallback()
	{
		await _semaphore.WaitAsync();

		try
		{
			var manifest = await GetManifest(CancellationToken.None);
			var originalManifestFiles = manifest.Files.ToList(); // avoid modifying collection while enumerating

			foreach (var fileName in originalManifestFiles)
			{
				var fullFileName = Path.Combine(CachePath, fileName);
				try
				{
					File.Delete(fullFileName);
				}
				catch (Exception ex)
				{
					Logger.LogWarning(ex, "Failed to delete cached file {File}", fullFileName);
					continue;
				}

				manifest.Files.Remove(fileName);
			}

			await SaveManifest(manifest);
		}
		finally
		{
			_semaphore.Release();
		}
	}

	protected override async Task<TValue> FetchFallback(TKey key, CancellationToken cancellationToken)
	{
		var fileName = getFileName(key);
		var fullFileName = Path.Combine(CachePath, fileName);
		await _semaphore.WaitAsync(cancellationToken);

		try
		{
			await using var stream = File.OpenRead(fullFileName);
			return await deserialize(key, stream, cancellationToken);
		}
		finally
		{
			_semaphore.Release();
		}
	}

	protected override async Task OnValueFetched(TKey key, TValue? value)
	{
		await base.OnValueFetched(key, value);

		if (value is null)
			return;

		var fileName = getFileName(key);
		var fullFileName = Path.Combine(CachePath, fileName);

		try
		{
			await _semaphore.WaitAsync();
			try
			{
				Directory.CreateDirectory(CachePath);
				await using var stream = File.Create(fullFileName);
				await serialize(key, value, stream);

				var manifest = await GetManifest(CancellationToken.None);
				if (!manifest.Files.Contains(fileName))
				{
					manifest.Files.Add(fileName);
					await SaveManifest(manifest);
				}
			}
			finally
			{
				_semaphore.Release();
			}
		}
		catch (Exception ex)
		{
			Logger.LogWarning(ex, "Failed to save {Name} to disk cache", Name);
		}
	}

	private async Task<CacheManifest> GetManifest(CancellationToken cancellationToken)
	{
		string json;
		try
		{
			json = await File.ReadAllTextAsync(ManifestFullFileName, cancellationToken);
		}
		catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
		{
			return new();
		}

		return JsonSerializer.Deserialize<CacheManifest>(json) ?? new CacheManifest();
	}

	private async Task SaveManifest(CacheManifest manifest)
	{
		Directory.CreateDirectory(
			Path.GetDirectoryName(ManifestFullFileName)
				?? throw new InvalidOperationException("Invalid manifest path")
		);
		var json = JsonSerializer.Serialize(manifest);
		await File.WriteAllTextAsync(ManifestFullFileName, json);
	}

	public void Dispose()
	{
		_semaphore.Dispose();
	}
}

/// <summary>
/// Keyless wrapper for single-value caches.
/// </summary>
internal class ApiCache<TValue>(
	CacheTimings timings,
	Func<CancellationToken, Task<TValue>> fetch,
	ILogger logger,
	string? name = null
) : ApiCache<Unit, TValue>(timings, (_, ct) => fetch(ct), logger, name), IApiCache<TValue>
{
	public Task<TValue?> GetAsync(CancellationToken cancellationToken = default) =>
		GetAsync(default, cancellationToken);
}

/// <summary>
/// Keyless wrapper for single-value disk-backed caches.
/// </summary>
internal class DiskBackedApiCache<TValue>(
	CacheTimings timings,
	Func<CancellationToken, Task<TValue>> fetch,
	string cachePath,
	string manifestFullFileName,
	string fileName,
	Func<TValue, Stream, Task> serialize,
	Func<Stream, CancellationToken, Task<TValue>> deserialize,
	ILogger logger,
	string? name = null
)
	: DiskBackedApiCache<Unit, TValue>(
		timings,
		(_, ct) => fetch(ct),
		cachePath,
		manifestFullFileName,
		_ => fileName,
		(_, value, stream) => serialize(value, stream),
		(_, stream, ct) => deserialize(stream, ct),
		logger,
		name
	),
		IApiCache<TValue>
{
	public Task<TValue?> GetAsync(CancellationToken cancellationToken = default) =>
		GetAsync(default, cancellationToken);
}

internal static class DiskBasedApiCache
{
	/// <summary>
	/// Creates a disk-based API cache if cache path and manifest path is specified. If not, creates an in-memory only cache.
	/// </summary>
	public static IApiCache<TKey, TValue> Create<TKey, TValue>(
		CacheTimings timings,
		Func<TKey, CancellationToken, Task<TValue>> fetch,
		string? cachePath,
		string? manifestFullFileName,
		Func<TKey, string> getFileName,
		Func<TKey, TValue, Stream, Task> serialize,
		Func<TKey, Stream, CancellationToken, Task<TValue>> deserialize,
		ILogger logger,
		string? name = null
	)
		where TKey : notnull
	{
		return string.IsNullOrEmpty(cachePath) || string.IsNullOrEmpty(manifestFullFileName)
			? new ApiCache<TKey, TValue>(timings, fetch, logger, name)
			: new DiskBackedApiCache<TKey, TValue>(
				timings,
				fetch,
				cachePath,
				manifestFullFileName,
				getFileName,
				serialize,
				deserialize,
				logger,
				name
			);
	}

	/// <summary>
	/// Creates a disk-based API cache if cache path and manifest path is specified. If not, creates an in-memory only cache.
	/// </summary>
	public static IApiCache<TValue> Create<TValue>(
		CacheTimings timings,
		Func<CancellationToken, Task<TValue>> fetch,
		string? cachePath,
		string? manifestFullFileName,
		string getFileName,
		Func<TValue, Stream, Task> serialize,
		Func<Stream, CancellationToken, Task<TValue>> deserialize,
		ILogger logger,
		string? name = null
	)
	{
		return string.IsNullOrEmpty(cachePath) || string.IsNullOrEmpty(manifestFullFileName)
			? new ApiCache<TValue>(timings, fetch, logger, name)
			: new DiskBackedApiCache<TValue>(
				timings,
				fetch,
				cachePath,
				manifestFullFileName,
				getFileName,
				serialize,
				deserialize,
				logger,
				name
			);
	}
}

internal sealed class CacheManifest
{
	public List<string> Files { get; init; } = [];
}

internal class CacheTimings
{
	public TimeSpan Ttl { get; init; } = TimeSpan.FromHours(1);
	public TimeSpan StaleRefresh { get; init; } = TimeSpan.FromMinutes(30);
	public TimeSpan NegativeTtl { get; init; } = TimeSpan.FromMinutes(1);
}

internal sealed class CacheEntry<T>(T value, TimeSpan ttl, TimeSpan staleThreshold, DateTimeOffset createdAt)
{
	public T Value => value;
	public bool IsExpired => DateTimeOffset.UtcNow - createdAt > ttl;
	public bool IsStale => DateTimeOffset.UtcNow - createdAt > staleThreshold;
}

internal sealed class NegativeCacheEntry(TimeSpan ttl)
{
	private readonly DateTimeOffset _createdAt = DateTimeOffset.UtcNow;
	public bool IsExpired => DateTimeOffset.UtcNow - _createdAt > ttl;
}
