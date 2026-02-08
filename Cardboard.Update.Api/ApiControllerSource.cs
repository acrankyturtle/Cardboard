using System.Net.Http.Json;
using System.Text.Json;
using Cardboard.Update.Api.Abstractions;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

file class ApiControllerSource(
	IHttpClientFactory httpClientFactory,
	IOptions<UpdateSourceConfiguration> options,
	IOptions<CacheTimings> cacheTimingOptions,
	ILogger<ApiControllerSource> logger
) : IControllerUpdateSource, IClearMemoryCache
{
	private readonly ApiCache<Version?> _versionCache = new(
		cacheTimingOptions.Value,
		async ct =>
		{
			var client = httpClientFactory.CreateClient(nameof(ApiControllerSource));
			var url = GetControllerUrl(options.Value.Url, null, null, options.Value.Channel);
			logger.LogDebug("Fetching latest controller version from {Url}", url);

			var response = await client.GetAsync(url, ct);

			if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
				return null;

			response.EnsureSuccessStatusCode();

			return (
				await response.Content.ReadFromJsonAsync<ControllerVersionResponse>(ct)
				?? throw new JsonException()
			).Version;
		},
		logger
	);

	public async Task<Version?> GetLatestVersion(CancellationToken cancellationToken = default) =>
		await _versionCache.GetAsync(cancellationToken);

	public string GetDownloadUrl(Version? version) =>
		GetControllerUrl(options.Value.Url, "download", version, options.Value.Channel);

	private static string GetControllerUrl(
		string baseUrl,
		string? action,
		Version? version,
		UpdateChannel channel
	)
	{
		var url = $"{baseUrl}/controller/{version?.ToString() ?? "latest"}/{action}";
		var queryParams = new Dictionary<string, string?>
		{
			["channel"] = channel.HasFlag(UpdateChannel.Preview) ? "preview" : "stable",
		};
		return QueryHelpers.AddQueryString(url, queryParams);
	}

	public void ClearMemoryCache()
	{
		_versionCache.Clear();
	}
}

partial class Services
{
	public static IServiceCollection AddApiControllerSource(this IServiceCollection services)
	{
		services.AddSingleton<ApiControllerSource>();
		services.AddSingleton<IControllerUpdateSource>(sp => sp.GetRequiredService<ApiControllerSource>());
		services.AddSingleton<IClearMemoryCache>(sp => sp.GetRequiredService<ApiControllerSource>());
		services.AddHttpClient(
			nameof(ApiControllerSource),
			(sp, client) =>
			{
				var config = sp.GetRequiredService<IOptions<UpdateSourceConfiguration>>();
				client.BaseAddress = new(config.Value.Url);
				client.Timeout = TimeSpan.FromSeconds(30);
			}
		);
		return services;
	}
}
