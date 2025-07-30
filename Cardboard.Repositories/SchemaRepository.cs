using System.Text.Json;
using System.Text.Json.Nodes;
using Cardboard.JsonSchema;
using Microsoft.Extensions.DependencyInjection;
using StronglyTypedIds;

namespace Cardboard.Repositories;

public interface ISchemaRepository
{
	Task<IReadOnlyCollection<SchemaSummary>> GetSchemas(CancellationToken cancellationToken = default);

	Task<SchemaDetails?> GetSchemaDetails(SchemaName name, CancellationToken cancellationToken = default);
}

[StronglyTypedId(Template.String)]
public readonly partial struct SchemaName;

public sealed class SchemaSummary
{
	public required SchemaName Name { get; init; }
}

public sealed class SchemaDetails
{
	public required SchemaName Name { get; init; }
	public required string AssemblyQualifiedName { get; init; }
	public required JsonNode Schema { get; init; }
}

file class SchemaRepository(JsonSerializerOptions serializerOptions) : ISchemaRepository
{
	private readonly Dictionary<SchemaName, SchemaDetails> _schemas = JsonSchemaGenerator
		.GetAllSchemasFromAllAssemblies(AppDomain.CurrentDomain, serializerOptions)
		.ToDictionary(
			x => new SchemaName(x.Name),
			x => new SchemaDetails
			{
				Name = new(x.Name),
				AssemblyQualifiedName = x.AssemblyQualifiedName,
				Schema = x.Schema,
			}
		);

	public Task<IReadOnlyCollection<SchemaSummary>> GetSchemas(
		CancellationToken cancellationToken = default
	) =>
		Task.FromResult<IReadOnlyCollection<SchemaSummary>>(
			_schemas.Values.Select(x => new SchemaSummary { Name = x.Name }).ToList()
		);

	public Task<SchemaDetails?> GetSchemaDetails(
		SchemaName name,
		CancellationToken cancellationToken = default
	) => Task.FromResult(_schemas.GetValueOrDefault(name));
}

partial class Services
{
	private static IServiceCollection AddSchemaRepository(this IServiceCollection services) =>
		services.AddSingleton<ISchemaRepository, SchemaRepository>();
}
