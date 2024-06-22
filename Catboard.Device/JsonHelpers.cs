using System.Text;
using System.Text.Json;

namespace Catboard.Device;

public static class JsonHelpers
{
	public static T ReadObject<T>(ref ReadOnlySpan<byte> buffer)
		where T : notnull
	{
		var reader = new Utf8JsonReader(buffer);
		var value = JsonSerializer.Deserialize<T>(ref reader) ?? throw new NullReferenceException();

		var size = (int)reader.BytesConsumed;
		buffer = buffer[size..];

		return value;
	}

	public static T ReadObject<T>(Stream stream)
		where T : notnull => JsonSerializer.Deserialize<T>(stream) ?? throw new NullReferenceException();

	public static T ReadObject<T>(this BinaryReader reader)
		where T : notnull => ReadObject<T>(reader.BaseStream);

	public static void WriteObject<T>(T value, ref Span<byte> buffer)
	{
		var json = JsonSerializer.Serialize(value);
		var bytes = Encoding.UTF8.GetBytes(json);
		var size = bytes.Length;

		bytes.CopyTo(buffer); // todo: perf
		buffer = buffer[size..];
	}

	public static void WriteObject<T>(T value, Stream stream) => JsonSerializer.Serialize(stream, value);

	public static void WriteObject<T>(this BinaryReader reader, T value) =>
		WriteObject(value, reader.BaseStream);
}
