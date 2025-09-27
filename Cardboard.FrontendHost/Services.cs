using Cardboard.HttpApi;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Cardboard.FrontendHost;

public static partial class Services
{
	public static IServiceCollection AddFrontendService(this IServiceCollection services) =>
		services.AddSingleton<IFrontendService, FrontendService>();

	public static IServiceCollection AddFrontendHosting(this IServiceCollection services)
	{
		// services.AddSingleton<IReactHostService, ReactHostService>();
		// services
		// 	.AddHttpClient("frontend")
		// 	.ConfigurePrimaryHttpMessageHandler(() =>
		// 		new HttpClientHandler
		// 		{
		// 			AllowAutoRedirect = false,
		// 			UseCookies = false,
		// 			UseProxy = false,
		// 		}
		// 	);

		return services;
	}

	// public static IServiceCollection ConfigureFrontendHost(
	// 	this IServiceCollection services,
	// 	IConfigurationSection configuration
	// ) => services.Configure<ReactHostConfiguration>(configuration);

	public static IEndpointRouteBuilder MapFrontendApi(this IEndpointRouteBuilder builder)
	{
		var api = builder.MapGroup("api");

		api.MapDeviceRepositoryEndpoints();
		api.MapTagRepositoryEndpoints();
		api.MapSchemaEndpoints();

		// builder.MapFallback("/{**path}", FallbackToReact);

		return builder;
	}

	// private static async Task<Results<ContentHttpResult, ProblemHttpResult, NotFound>> FallbackToReact(
	// 	string? path,
	// 	[FromServices] IReactHostService reactService,
	// 	[FromServices] IHttpClientFactory httpClientFactory,
	// 	[FromServices] IOptions<ReactHostConfiguration> configuration
	// )
	// {
	// 	// normalize path
	// 	path = path?.TrimStart('/') ?? "";
	//
	// 	if (path.StartsWith("api/", StringComparison.OrdinalIgnoreCase))
	// 		// don't proxy API requests
	// 		return TypedResults.NotFound();
	//
	// 	await reactService.EnsureStartedAsync();
	//
	// 	using var httpClient = httpClientFactory.CreateClient();
	// 	httpClient.Timeout = TimeSpan.FromSeconds(30);
	//
	// 	var port = configuration.Value.Port;
	//
	// 	try
	// 	{
	// 		var targetUrl = new UriBuilder
	// 		{
	// 			Scheme = "http",
	// 			Host = "localhost",
	// 			Port = port,
	// 			Path = path,
	// 		}.ToString();
	//
	// 		var response = await httpClient.GetAsync(targetUrl);
	// 		var content = await response.Content.ReadAsStringAsync();
	// 		var contentType = response.Content.Headers.ContentType?.ToString() ?? "text/html";
	//
	// 		return TypedResults.Content(content, contentType);
	// 	}
	// 	catch (HttpRequestException ex)
	// 	{
	// 		return TypedResults.Problem($"Failed to reach React server: {ex.Message}", statusCode: 503);
	// 	}
	// 	catch (Exception ex)
	// 	{
	// 		return TypedResults.Problem($"Failed to proxy request: {ex.Message}");
	// 	}
	// }
}
