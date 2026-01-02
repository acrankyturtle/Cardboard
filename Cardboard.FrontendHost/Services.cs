using Cardboard.HttpApi;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.FrontendHost;

public static partial class Services
{
	public static IServiceCollection AddFrontendHosting(this IServiceCollection services)
	{
		return services;
	}

	/// <summary>
	/// Adds middleware to block requests from external origins.
	/// Prevents malicious websites from making requests to the local API via the browser.
	/// </summary>
	public static IApplicationBuilder UseLocalOriginValidation(this IApplicationBuilder app)
	{
		app.Use(async (context, next) =>
		{
			var origin = context.Request.Headers.Origin.ToString();

			// If there's an Origin header, validate it's from localhost
			if (!string.IsNullOrEmpty(origin))
			{
				if (!IsLocalOrigin(origin))
				{
					context.Response.StatusCode = StatusCodes.Status403Forbidden;
					return;
				}
			}

			// Also check Referer for additional protection
			var referer = context.Request.Headers.Referer.ToString();
			if (!string.IsNullOrEmpty(referer))
			{
				if (!IsLocalOrigin(referer))
				{
					context.Response.StatusCode = StatusCodes.Status403Forbidden;
					return;
				}
			}

			await next();
		});

		return app;
	}

	private static bool IsLocalOrigin(string origin)
	{
		if (string.IsNullOrEmpty(origin))
			return true;

		// Parse and validate the origin
		if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
			return false;

		var host = uri.Host.ToLowerInvariant();
		return host is "localhost" or "127.0.0.1";
	}

	public static IEndpointRouteBuilder MapFrontendApi(this IEndpointRouteBuilder builder)
	{
		var api = builder.MapGroup("api");

		api.MapDeviceRepositoryEndpoints();
		api.MapTagRepositoryEndpoints();
		api.MapSchemaEndpoints();
		api.MapLogEndpoints();

		return builder;
	}

	/// <summary>
	/// Configures the application to serve the React SPA from wwwroot.
	/// This should only be called in Release/Production mode.
	/// </summary>
	public static IApplicationBuilder UseSpaStaticFiles(this IApplicationBuilder app)
	{
		// SPA fallback: rewrite non-file, non-API requests to index.html before static files middleware
		app.Use(
			async (context, next) =>
			{
				var path = context.Request.Path.Value ?? "";

				// Skip API routes
				if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
				{
					await next();
					return;
				}

				// If the path has a file extension, let static files handle it
				if (Path.HasExtension(path))
				{
					await next();
					return;
				}

				// For SPA routes (no extension, not API), rewrite to index.html
				context.Request.Path = "/index.html";
				await next();
			}
		);

		// Serve static files from wwwroot
		app.UseStaticFiles();

		return app;
	}
}
