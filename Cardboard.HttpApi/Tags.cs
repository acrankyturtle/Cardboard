using Cardboard.Device;
using Cardboard.Repositories;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Cardboard.HttpApi;

public static class Tags
{
	public static void MapTagRepositoryEndpoints(this IEndpointRouteBuilder builder)
	{
		var group = builder.MapGroup("tags").WithTags("Tags");

		group
			.MapGet("/", GetTagAssociations)
			.WithName("Get Tag Associations")
			.Produces<GetTagAssociationsResponse>();
		group
			.MapPost("/", CreateTagAssociation)
			.WithName("Create Tag Association")
			.Produces<CreateTagAssociationResponse>();
		group
			.MapGet("/{id}", GetTagAssociation)
			.WithName("Get Tag Association")
			.Produces<GetTagAssociationResponse>()
			.Produces(StatusCodes.Status404NotFound);
		group
			.MapPut("/{id}", UpdateTagAssociation)
			.WithName("Update Tag Association")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status404NotFound);
		group
			.MapDelete("/{id}", DeleteTagAssociation)
			.WithName("Delete Tag Association")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status404NotFound);
	}

	private static async Task<Ok<GetTagAssociationsResponse>> GetTagAssociations(
		[FromServices] IAssociationRepository associationRepository,
		CancellationToken cancellationToken
	) =>
		TypedResults.Ok(
			new GetTagAssociationsResponse
			{
				Associations = await associationRepository.GetAssociations(
					cancellationToken: cancellationToken
				),
			}
		);

	private static async Task<Results<Ok<GetTagAssociationResponse>, NotFound>> GetTagAssociation(
		[FromRoute] ApplicationAssociationId id,
		[FromServices] IAssociationRepository associationRepository,
		CancellationToken cancellationToken
	) =>
		await associationRepository.GetAssociation(id, cancellationToken) is { } tagAssociation
			? TypedResults.Ok(new GetTagAssociationResponse { Association = tagAssociation })
			: TypedResults.NotFound();

	private static async Task<Ok<CreateTagAssociationResponse>> CreateTagAssociation(
		[FromBody] ApplicationAssociationData data,
		[FromServices] IAssociationRepository associationRepository,
		CancellationToken cancellationToken
	)
	{
		var id = await associationRepository.CreateAssociation(data, cancellationToken);
		return TypedResults.Ok(new CreateTagAssociationResponse { Id = id });
	}

	private static async Task<Results<NoContent, NotFound>> UpdateTagAssociation(
		[FromRoute] ApplicationAssociationId id,
		[FromBody] ApplicationAssociationData data,
		[FromServices] IAssociationRepository associationRepository,
		CancellationToken cancellationToken
	) =>
		await associationRepository.UpdateAssociation(id, data, cancellationToken)
			? TypedResults.NoContent()
			: TypedResults.NotFound();

	private static async Task<Results<NoContent, NotFound>> DeleteTagAssociation(
		[FromRoute] ApplicationAssociationId id,
		[FromServices] IAssociationRepository associationRepository,
		CancellationToken cancellationToken
	) =>
		await associationRepository.DeleteAssociation(id, cancellationToken)
			? TypedResults.NoContent()
			: TypedResults.NotFound();
}

public sealed class GetTagAssociationsResponse
{
	public required IReadOnlyCollection<ApplicationAssociation> Associations { get; init; }
}

public sealed class CreateTagAssociationResponse
{
	public required ApplicationAssociationId Id { get; init; }
}

public sealed class GetTagAssociationResponse
{
	public required ApplicationAssociation Association { get; init; }
}

public sealed class GetTagsInUseResponse
{
	public required IReadOnlyCollection<LayerTag> TagsFromAssociations { get; init; }
	public required IReadOnlyCollection<LayerTag> TagsFromDevices { get; init; }
}
