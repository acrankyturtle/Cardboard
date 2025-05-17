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
			.Produces<GetTagAssociationsResponse>()
			.WithOpenApi();
		group
			.MapPost("/", CreateTagAssociation)
			.WithName("Create Tag Association")
			.Produces<CreateTagAssociationResponse>()
			.WithOpenApi();
		group
			.MapGet("/{id}", GetTagAssociation)
			.WithName("Get Tag Association")
			.Produces<GetTagAssociationResponse>()
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapPut("/{id}", UpdateTagAssociation)
			.WithName("Update Tag Association")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapDelete("/{id}", DeleteTagAssociation)
			.WithName("Delete Tag Association")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
	}

	private static async Task<Ok<GetTagAssociationsResponse>> GetTagAssociations(
		ITagRepository tagRepository,
		CancellationToken cancellationToken
	) =>
		TypedResults.Ok(
			new GetTagAssociationsResponse
			{
				Associations = await tagRepository.GetAssociations(cancellationToken),
			}
		);

	private static async Task<Results<Ok<GetTagAssociationResponse>, NotFound>> GetTagAssociation(
		[FromRoute] TagAssociationId id,
		ITagRepository tagRepository,
		CancellationToken cancellationToken
	) =>
		await tagRepository.GetAssociation(id, cancellationToken) is { } tagAssociation
			? TypedResults.Ok(new GetTagAssociationResponse { Association = tagAssociation })
			: TypedResults.NotFound();

	private static async Task<Ok<CreateTagAssociationResponse>> CreateTagAssociation(
		[FromBody] TagAssociationData data,
		ITagRepository tagRepository,
		CancellationToken cancellationToken
	)
	{
		var id = await tagRepository.CreateAssociation(data, cancellationToken);
		return TypedResults.Ok(new CreateTagAssociationResponse { Id = id });
	}

	private static async Task<Results<NoContent, NotFound>> UpdateTagAssociation(
		[FromRoute] TagAssociationId id,
		[FromBody] TagAssociationData data,
		ITagRepository tagRepository,
		CancellationToken cancellationToken
	) =>
		await tagRepository.UpdateAssociation(id, data, cancellationToken)
			? TypedResults.NoContent()
			: TypedResults.NotFound();

	private static async Task<Results<NoContent, NotFound>> DeleteTagAssociation(
		[FromRoute] TagAssociationId id,
		ITagRepository tagRepository,
		CancellationToken cancellationToken
	) =>
		await tagRepository.DeleteAssociation(id, cancellationToken)
			? TypedResults.NoContent()
			: TypedResults.NotFound();
}

public sealed class GetTagAssociationsResponse
{
	public required IReadOnlyCollection<TagAssociation> Associations { get; init; }
}

public sealed class CreateTagAssociationResponse
{
	public required TagAssociationId Id { get; init; }
}

public sealed class GetTagAssociationResponse
{
	public required TagAssociation Association { get; init; }
}

public sealed class GetTagsInUseResponse
{
	public required IReadOnlyCollection<LayerTag> TagsFromAssociations { get; init; }
	public required IReadOnlyCollection<LayerTag> TagsFromDevices { get; init; }
}
