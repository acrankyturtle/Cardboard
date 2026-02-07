using Microsoft.OpenApi;
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
		var nonNullableSchema = GetValueObjectInfo(typeof(TId), propertyName, false);
		var nullableSchema = GetValueObjectInfo(typeof(TId), propertyName, true);

		options.SchemaGeneratorOptions.CustomTypeMappings[typeof(TId)] = () => nonNullableSchema;
		options.SchemaGeneratorOptions.CustomTypeMappings[typeof(TId?)] = () => nullableSchema;

		return options;
	}

	private static OpenApiSchema GetValueObjectInfo(Type type, string propertyName, bool nullable)
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
			return new()
			{
				Type = JsonSchemaType.String | (nullable ? JsonSchemaType.Null : 0),
				Format = "uuid",
			};
		}

		if (propertyType == typeof(string))
		{
			return new() { Type = JsonSchemaType.String | (nullable ? JsonSchemaType.Null : 0) };
		}

		if (propertyType == typeof(long))
		{
			return new()
			{
				Type = JsonSchemaType.Integer | (nullable ? JsonSchemaType.Null : 0),
				Format = "int64",
			};
		}

		if (propertyType == typeof(int))
		{
			return new()
			{
				Type = JsonSchemaType.Integer | (nullable ? JsonSchemaType.Null : 0),
				Format = "int32",
			};
		}

		if (propertyType == typeof(uint))
		{
			return new()
			{
				Type = JsonSchemaType.Integer | (nullable ? JsonSchemaType.Null : 0),
				Format = "int64",
				Minimum = "0",
				Maximum = uint.MaxValue.ToString(),
			};
		}

		if (propertyType == typeof(ushort))
		{
			return new()
			{
				Type = JsonSchemaType.Integer | (nullable ? JsonSchemaType.Null : 0),
				Format = "int32",
				Minimum = "0",
				Maximum = ushort.MaxValue.ToString(),
			};
		}

		throw new InvalidOperationException(
			$"{propertyType} is not a valid property type for value objects."
		);
	}
}
