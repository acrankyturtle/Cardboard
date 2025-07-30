using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Schema;

namespace Cardboard.JsonSchema;

public static class JsonSchemaGenerator
{
	public static IReadOnlyCollection<JsonSchema> GetAllSchemasFromAllAssemblies(
		AppDomain appDomain,
		JsonSerializerOptions serializerOptions
	)
	{
		return appDomain
			.GetAssemblies()
			.SelectMany(a => a.GetTypes())
			.Select(t =>
				t.GetCustomAttribute<GenerateSchemaAttribute>()?.GetSchemaName(t) is { } name
					? (JsonSchema?)GenerateSchemaForType(name, t, serializerOptions)
					: null
			)
			.OfType<JsonSchema>()
			.ToList();
	}

	private static JsonSchema GenerateSchemaForType(
		string name,
		Type type,
		JsonSerializerOptions serializerOptions
	)
	{
		var node = serializerOptions.GetJsonSchemaAsNode(type);

		// add metadata
		if (node is JsonObject schemaObj)
		{
			schemaObj["$id"] = $"https://ggbim.com/cardboard/schemas/{name}";
			schemaObj["title"] = type.Name;
			schemaObj["description"] = $"Auto generated from {type.AssemblyQualifiedName}";
		}

		return new()
		{
			Name = name,
			AssemblyQualifiedName =
				type.AssemblyQualifiedName
				?? throw new InvalidOperationException(
					$"Type {type.FullName} does not have an assembly qualified name."
				),
			Schema = node,
		};
	}
}

public sealed class JsonSchema
{
	public required string Name { get; init; }
	public required string AssemblyQualifiedName { get; init; }
	public required JsonNode Schema { get; init; }
}

[AttributeUsage(AttributeTargets.Class)]
public class GenerateSchemaAttribute(string? name = null) : Attribute
{
	internal string GetSchemaName(Type type) => name ?? type.Name;
}
