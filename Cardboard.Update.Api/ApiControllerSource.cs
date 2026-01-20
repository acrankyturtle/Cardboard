using System.Net.Http.Json;
using System.Text.Json;
using Cardboard.Update.Api.Abstractions;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

file class ApiControllerSource(HttpClient httpClient, IOptions<UpdateSourceConfiguration> options)
	: IControllerUpdateSource
{
	public async Task<string?> GetLatestVersion(CancellationToken cancellationToken = default)
	{
		var url = GetControllerUrl(null, null, options.Value.Channel);
		var response = await httpClient.GetAsync(url, cancellationToken);

		if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
			return null;

		response.EnsureSuccessStatusCode();

		return (
			await response.Content.ReadFromJsonAsync<ControllerVersionResponse>(cancellationToken)
			?? throw new JsonException()
		).Version;
	}

	public string GetDownloadUrl(string? version)
	{
		return GetControllerUrl("download", version, options.Value.Channel);
	}

	private string GetControllerUrl(string? action, string? version, UpdateChannel channel)
	{
		var url = $"{options.Value.Url}/controller/{version ?? "latest"}/{action}";
		var queryParams = new Dictionary<string, string?>
		{
			["channel"] = channel.HasFlag(UpdateChannel.Preview) ? "preview" : "stable",
		};
		return QueryHelpers.AddQueryString(url, queryParams);
	}
}

partial class Services
{
	public static IServiceCollection AddApiControllerSource(this IServiceCollection services)
	{
		services
			.AddSingleton<IControllerUpdateSource, ApiControllerSource>()
			.AddHttpClient<ApiControllerSource>(
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
