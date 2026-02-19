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

internal sealed class ApiMetadataSource(
	IHttpClientFactory httpClientFactory,
	IOptions<UpdateSourceConfiguration> options,
	IOptions<MetadataCacheConfiguration> cacheOptions,
	IOptions<CacheTimings> cacheTimingOptions,
	IOptions<JsonOptions> jsonOptions,
	ILogger<ApiMetadataSource> logger
) : IMetadataSource, IClearMemoryCache, IClearDiskCache
{
	private static readonly JsonSerializerOptions _cacheJsonOptions = CreateCacheJsonOptions();

	private static JsonSerializerOptions CreateCacheJsonOptions()
	{
		var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
		options.Converters.Add(new JsonStringEnumConverter());
		return options;
	}

	private readonly IApiCache<DeviceTypeId, DeviceMetadata> _metadataCache = DiskBasedApiCache.Create<
		DeviceTypeId,
		DeviceMetadata
	>(
		cacheTimingOptions.Value,
		async (deviceTypeId, ct) =>
		{
			var client = httpClientFactory.CreateClient(nameof(ApiMetadataSource));
			var url = $"{options.Value.Url}/metadata/{deviceTypeId}";
			logger.LogDebug("Fetching metadata from {Url}", url);

			var response = await client.GetAsync(url, ct);
			response.EnsureSuccessStatusCode();

			var dto =
				await response.Content.ReadFromJsonAsync<DeviceMetadataResponse>(
					jsonOptions.Value.SerializerOptions,
					ct
				) ?? throw new JsonException();
			return dto.Metadata;
		},
		cacheOptions.Value.MetadataCache,
		cacheOptions.Value.MetadataCacheManifest,
		deviceTypeId => $"{deviceTypeId}.json",
		async (_, v, stream) =>
		{
			var json = JsonSerializer.Serialize(v, _cacheJsonOptions);
			await using var writer = new StreamWriter(stream, leaveOpen: true);
			await writer.WriteAsync(json);
		},
		async (_, stream, ct) =>
		{
			using var reader = new StreamReader(stream, leaveOpen: true);
			var json = await reader.ReadToEndAsync(ct);
			return JsonSerializer.Deserialize<DeviceMetadata>(json, _cacheJsonOptions)
				?? throw new JsonException();
		},
		logger
	);

	private readonly ApiCache<IReadOnlyCollection<MetadataListEntry>> _listCache = new(
		cacheTimingOptions.Value,
		async ct =>
		{
			var client = httpClientFactory.CreateClient(nameof(ApiMetadataSource));
			var url = $"{options.Value.Url}/metadata";
			logger.LogDebug("Fetching metadata list from {Url}", url);

			var response = await client.GetAsync(url, ct);
			response.EnsureSuccessStatusCode();

			var dto = await response.Content.ReadFromJsonAsync<MetadataListResponse>(
				jsonOptions.Value.SerializerOptions,
				ct
			);
			return dto is not null
				? (IReadOnlyCollection<MetadataListEntry>)
					dto
						.Entries.Select(e => new MetadataListEntry
						{
							DeviceTypeId = e.DeviceTypeId,
							Model = e.Model,
							Variants = e.Variants,
						})
						.ToList()
				: [];
		},
		logger,
		name: "MetadataList"
	);

	public async Task<DeviceMetadata?> GetMetadata(
		DeviceTypeId deviceTypeId,
		CancellationToken cancellationToken
	) => await _metadataCache.GetAsync(deviceTypeId, cancellationToken);

	public async Task<IReadOnlyCollection<MetadataListEntry>> GetMetadataList(
		CancellationToken cancellationToken
	) => await _listCache.GetAsync(cancellationToken) ?? [];

	public void ClearMemoryCache()
	{
		_metadataCache.Clear();
		_listCache.Clear();
	}

	public async Task ClearDiskCache()
	{
		await _metadataCache.ClearFallback();
		await _listCache.ClearFallback();
	}
}

public class MetadataCacheConfiguration
{
	public string? MetadataCache { get; init; }
	public string? MetadataCacheManifest { get; init; }
}

partial class Services
{
	public static IServiceCollection AddApiMetadataSource(
		this IServiceCollection services,
		IConfigurationSection configuration
	)
	{
		services.AddSingleton<ApiMetadataSource>();
		services.AddSingleton<IMetadataSource>(sp => sp.GetRequiredService<ApiMetadataSource>());
		services.AddSingleton<IClearMemoryCache>(sp => sp.GetRequiredService<ApiMetadataSource>());
		services.AddSingleton<IClearDiskCache>(sp => sp.GetRequiredService<ApiMetadataSource>());
		services.AddHttpClient(
			nameof(ApiMetadataSource),
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
