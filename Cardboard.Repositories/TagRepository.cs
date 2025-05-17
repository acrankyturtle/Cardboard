using System.Text.Json;
using Cardboard.Device;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StronglyTypedIds;

namespace Cardboard.Repositories;

public interface ITagRepository
{
	Task<IReadOnlyCollection<TagAssociation>> GetAssociations(CancellationToken cancellationToken = default);

	Task<TagAssociationId> CreateAssociation(
		TagAssociationData tagAssociation,
		CancellationToken cancellationToken = default
	);

	Task<TagAssociation?> GetAssociation(TagAssociationId id, CancellationToken cancellationToken = default);

	Task<bool> UpdateAssociation(
		TagAssociationId id,
		TagAssociationData tagAssociation,
		CancellationToken cancellationToken = default
	);

	Task<bool> DeleteAssociation(TagAssociationId id, CancellationToken cancellationToken = default);

	Task<TagsInUseResult> GetTagsInUse(CancellationToken cancellationToken = default);

	Task<IReadOnlyCollection<TagAssociation>> GetMatches(
		string path,
		CancellationToken cancellationToken = default
	);
}

[StronglyTypedId]
public readonly partial struct TagAssociationId;

public sealed class TagsInUseResult
{
	public required IReadOnlyCollection<LayerTag> TagsFromAssociations { get; init; }
	public required IReadOnlyCollection<LayerTag> TagsFromDevices { get; init; }
}

public record TagAssociation
{
	public required TagAssociationId Id { get; init; }
	public required TagAssociationData Data { get; init; }
}

public record TagAssociationData
{
	public required IReadOnlyCollection<LayerTag> Tags { get; init; }
	public IReadOnlyCollection<string> MatchOnPath { get; init; } = [];
}

file class JsonTagRepository(IOptions<TagRepositoryConfiguration> configuration, IDeviceService deviceService)
	: ITagRepository
{
	private static readonly JsonSerializerOptions _serializerOptions =
		new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase, };

	public async Task<IReadOnlyCollection<TagAssociation>> GetAssociations(
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);
		return repository.Associations;
	}

	public async Task<TagAssociationId> CreateAssociation(
		TagAssociationData tagAssociation,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);

		var id = new TagAssociationId(Guid.NewGuid());
		var association = new TagAssociation
		{
			Id = id,
			Data = new() { Tags = tagAssociation.Tags, MatchOnPath = tagAssociation.MatchOnPath, },
		};
		repository.Associations.Add(association);

		await Save(repository);
		return id;
	}

	public async Task<TagAssociation?> GetAssociation(
		TagAssociationId id,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);
		return repository.Associations.FirstOrDefault(x => x.Id == id);
	}

	public async Task<bool> UpdateAssociation(
		TagAssociationId id,
		TagAssociationData tagAssociation,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);

		var index = repository.Associations.FindIndex(x => x.Id == id);
		if (index < 0)
			return false;

		repository.Associations[index] = repository.Associations[index] with { Data = tagAssociation };

		await Save(repository);
		return true;
	}

	public async Task<bool> DeleteAssociation(
		TagAssociationId id,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);

		var index = repository.Associations.FindIndex(x => x.Id == id);
		if (index < 0)
			return false;

		repository.Associations.RemoveAt(index);

		await Save(repository);
		return true;
	}

	public async Task<TagsInUseResult> GetTagsInUse(CancellationToken cancellationToken = default)
	{
		var repository = await Open(cancellationToken);

		var tagsFromAssociations = repository.Associations.SelectMany(x => x.Data.Tags).Order().ToList();
		var tagsFromDevices = (await GetTagsInUseOnDevices(cancellationToken)).Order().ToList();

		return new() { TagsFromAssociations = tagsFromAssociations, TagsFromDevices = tagsFromDevices, };
	}

	public async Task<IReadOnlyCollection<TagAssociation>> GetMatches(
		string path,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);
		return repository
			.Associations
			.Where(x => x.Data.MatchOnPath.Any(y => path.Contains(y, StringComparison.OrdinalIgnoreCase)))
			.ToList();
	}

	private async Task<TagRepositoryFile> Open(CancellationToken cancellationToken)
	{
		var path = configuration.Value.Path;

		if (!File.Exists(path))
			return new() { Associations = [] };

		var json = await File.ReadAllTextAsync(path, cancellationToken);
		return JsonSerializer.Deserialize<TagRepositoryFile>(json, _serializerOptions)
			?? throw new JsonException();
	}

	private async Task Save(TagRepositoryFile file)
	{
		var path = configuration.Value.Path;
		var directory = Path.GetDirectoryName(path)!;

		if (!Directory.Exists(directory))
			Directory.CreateDirectory(directory);

		var json = JsonSerializer.Serialize(file, _serializerOptions);
		await File.WriteAllTextAsync(path, json);
	}

	private async Task<IEnumerable<LayerTag>> GetTagsInUseOnDevices(CancellationToken cancellationToken)
	{
		var command = new GetProfileCommand();
		var results = await deviceService.SendCommand(command, new(), cancellationToken: cancellationToken);

		return results
			.Where(x => x.Result.IsSuccess)
			.SelectMany(x => x.Result.Assert().Keys.SelectMany(k => k.Layers.SelectMany(l => l.Tags)))
			.Distinct();
	}
}

file class TagRepositoryFile
{
	public required List<TagAssociation> Associations { get; init; }
}

public sealed class TagRepositoryConfiguration
{
	public required string TagAssociationsJson { get; init; }

	public string Path => Environment.ExpandEnvironmentVariables(TagAssociationsJson);
}

partial class Services
{
	private static IServiceCollection AddTagRepository(this IServiceCollection services) =>
		// todo: configuration?
		services.AddSingleton<ITagRepository, JsonTagRepository>();
}
