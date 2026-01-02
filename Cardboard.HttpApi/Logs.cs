using Cardboard.Repositories;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Cardboard.HttpApi;

public static class Logs
{
	public static void MapLogEndpoints(this IEndpointRouteBuilder builder)
	{
		var group = builder.MapGroup("logs").WithTags("Logs");

		group.MapGet("/", GetLogs).WithName("Get Logs").Produces<GetLogsResponse>().WithOpenApi();
		group
			.MapDelete("/", ClearLogs)
			.WithName("Clear Logs")
			.Produces(StatusCodes.Status204NoContent)
			.WithOpenApi();
	}

	private static Ok<GetLogsResponse> GetLogs(
		[FromServices] ILogSink logSink,
		[FromQuery] int? limit,
		[FromQuery] DateTimeOffset? since
	) => TypedResults.Ok(new GetLogsResponse { Entries = logSink.GetEntries(limit, since) });

	private static NoContent ClearLogs([FromServices] ILogSink logSink)
	{
		logSink.Clear();
		return TypedResults.NoContent();
	}
}

public sealed class GetLogsResponse
{
	public required IReadOnlyList<LogEntry> Entries { get; init; }
}
