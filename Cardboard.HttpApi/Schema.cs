using Cardboard.Repositories;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Cardboard.HttpApi;

public static class Schema
{
	public static void MapSchemaEndpoints(this IEndpointRouteBuilder builder)
	{
		var group = builder.MapGroup("schemas").WithTags("schemas");

		group.MapGet("/", GetSchemas).WithName("Get Schemas").Produces<SchemaListResponse>().WithOpenApi();
		group
			.MapGet("/{name}", GetSchema)
			.WithName("Get Schema")
			.Produces<SchemaDetailsResponse>()
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
	}

	private static async Task<Ok<SchemaListResponse>> GetSchemas(
		[FromServices] ISchemaRepository schemaRepository,
		CancellationToken cancellationToken
	) =>
		TypedResults.Ok(
			new SchemaListResponse { Schemas = await schemaRepository.GetSchemas(cancellationToken) }
		);

	private static async Task<Results<Ok<SchemaDetailsResponse>, NotFound>> GetSchema(
		[FromServices] ISchemaRepository schemaRepository,
		[FromRoute] SchemaName name,
		CancellationToken cancellationToken
	) =>
		await schemaRepository.GetSchemaDetails(name, cancellationToken) is { } schema
			? TypedResults.Ok(new SchemaDetailsResponse { Details = schema })
			: TypedResults.NotFound();
}

public class SchemaListResponse
{
	public required IReadOnlyCollection<SchemaSummary> Schemas { get; set; }
}

public class SchemaDetailsResponse
{
	public required SchemaDetails Details { get; set; }
}
