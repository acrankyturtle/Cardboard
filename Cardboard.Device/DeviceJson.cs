using System.Text.Json;
using System.Text.Json.Serialization;

namespace Cardboard.Device;

public static class DeviceJson
{
	public static JsonSerializerOptions SerializerOptions { get; } = CreateSerializerOptions();

	private static JsonSerializerOptions CreateSerializerOptions()
	{
		var serializer = new JsonSerializerOptions
		{
			PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
		};
		serializer.Converters.Add(new JsonStringEnumConverter());

		return serializer;
	}
}
