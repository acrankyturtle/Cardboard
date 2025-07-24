using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Cardboard.Controller;

public static class SwaggerStronglyTypedId
{
	public static SwaggerGenOptions MapStronglyTypedId<TId>(this SwaggerGenOptions options)
		where TId : struct
	{
		return options.MapValueObjectInternal<TId>("Value");
	}

	private static SwaggerGenOptions MapValueObjectInternal<TId>(
		this SwaggerGenOptions options,
		string propertyName
	)
		where TId : struct
	{
		var (schemaType, format) = GetValueObjectInfo(typeof(TId), propertyName);

		var schema = new OpenApiSchema { Type = schemaType, Format = format, };

		var nullableSchema = new OpenApiSchema
		{
			Type = schemaType,
			Format = format,
			Nullable = true,
		};

		options.SchemaGeneratorOptions.CustomTypeMappings[typeof(TId)] = () => schema;
		options.SchemaGeneratorOptions.CustomTypeMappings[typeof(TId?)] = () => nullableSchema;

		return options;
	}

	private static (string Type, string? Format) GetValueObjectInfo(Type type, string propertyName)
	{
		var property = type.GetProperty(propertyName);

		if (property == null)
		{
			throw new InvalidOperationException(
				$"{type} is not a valid type for value objects. Missing `{propertyName}` property."
			);
		}

		var propertyType = property.PropertyType;

		if (propertyType == typeof(Guid))
		{
			return ("string", "uuid");
		}

		if (propertyType == typeof(string))
		{
			return ("string", null);
		}

		if (propertyType == typeof(long))
		{
			return ("integer", "int64");
		}

		if (propertyType == typeof(int))
		{
			return ("integer", "int32");
		}

		throw new InvalidOperationException(
			$"{propertyType} is not a valid property type for value objects."
		);
	}
}
