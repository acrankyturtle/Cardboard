using System.Reflection;
using Cardboard.Update;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Cardboard.HttpApi;

public static class UpdateController
{
	public static void MapControllerEndpoints(this IEndpointRouteBuilder builder)
	{
		var group = builder.MapGroup("controller").WithTags("Controller");

		group
			.MapGet("/version", GetVersion)
			.WithName("Get Controller Version")
			.Produces<ControllerVersionResponse>()
			.WithOpenApi();
		group
			.MapGet("/update", CheckForUpdate)
			.WithName("Check For Update")
			.Produces<ControllerUpdateResponse>()
			.WithOpenApi();
	}

	private static Ok<ControllerVersionResponse> GetVersion() =>
		TypedResults.Ok(new ControllerVersionResponse { Version = GetCurrentVersion().ToVersionString() });

	private static async Task<Ok<ControllerUpdateResponse>> CheckForUpdate(
		[FromServices] IControllerUpdateSource updateSource,
		CancellationToken cancellationToken
	)
	{
		var currentVersion = GetCurrentVersion();
		var latestVersionStr = await updateSource.GetLatestVersion(cancellationToken);

		var updateAvailable =
			latestVersionStr is not null
			&& ParseVersion(latestVersionStr) is { } latestVersion
			&& latestVersion > currentVersion;
		var downloadUrl = updateAvailable ? updateSource.GetDownloadUrl(latestVersionStr!) : null;

		return TypedResults.Ok(
			new ControllerUpdateResponse
			{
				CurrentVersion = currentVersion.ToVersionString(),
				LatestVersion = latestVersionStr,
				UpdateAvailable = updateAvailable,
				DownloadUrl = downloadUrl,
			}
		);
	}

	private static Version GetCurrentVersion()
	{
		var assembly = Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly();

		var informationVersion = assembly
			.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
			?.InformationalVersion;

		if (informationVersion is not null)
			return ParseVersion(informationVersion)
				?? throw new InvalidOperationException("Unable to parse current version.");

		return assembly.GetName().Version
			?? throw new InvalidOperationException("Unable to determine current version.");
	}

	private static string ToVersionString(this Version version) => version.ToString(3);

	private static Version? ParseVersion(string versionStr)
	{
		var splitIndex = versionStr.IndexOf('+');
		var parseStr = splitIndex > -1 ? versionStr[..splitIndex] : versionStr;
		return Version.TryParse(parseStr, out var version) ? version : null;
	}
}

/// <summary>
/// Response for the local controller version endpoint.
/// Not to be confused with <see cref="Update.Api.Abstractions.ControllerVersionResponse"/>
/// which is used for update server communication.
/// </summary>
public sealed class ControllerVersionResponse
{
	public required string Version { get; init; }
}

public sealed class ControllerUpdateResponse
{
	public required string CurrentVersion { get; init; }
	public string? LatestVersion { get; init; }
	public required bool UpdateAvailable { get; init; }
	public string? DownloadUrl { get; init; }
}
