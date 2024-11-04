using System.Text;
using System.Text.Json;

namespace Cardboard.Device;

public static class BinaryHelpers
{
	public static BinaryReader CreateDeviceReader(this Stream stream, bool leaveOpen = false) =>
		new(stream, Encoding.UTF8, leaveOpen);

	public static BinaryWriter CreateDeviceWriter(this Stream stream, bool leaveOpen = false) =>
		new(stream, Encoding.UTF8, leaveOpen);

	public static T ReadJson<T>(ref ReadOnlySpan<byte> buffer)
		where T : notnull
	{
		var reader = new Utf8JsonReader(buffer);
		var value =
			JsonSerializer.Deserialize<T>(ref reader, DeviceJson.SerializerOptions)
			?? throw new NullReferenceException();

		var size = (int)reader.BytesConsumed;
		buffer = buffer[size..];

		return value;
	}

	public static ReadOnlyMemory<byte> AsMemory(this MemoryStream stream) =>
		stream.GetBuffer().AsMemory(0, (int)stream.Length);

	public static T ReadJson<T>(Stream stream)
		where T : notnull =>
		JsonSerializer.Deserialize<T>(stream, DeviceJson.SerializerOptions)
		?? throw new NullReferenceException();

	public static T ReadJson<T>(this BinaryReader reader)
		where T : notnull => ReadJson<T>(reader.BaseStream);

	public static void WriteJson<T>(T value, ref Span<byte> buffer)
	{
		var json = JsonSerializer.Serialize(value, DeviceJson.SerializerOptions);
		var bytes = Encoding.UTF8.GetBytes(json);
		var size = bytes.Length;

		bytes.CopyTo(buffer); // todo: perf
		buffer = buffer[size..];
	}

	public static void WriteJson<T>(T value, Stream stream) =>
		JsonSerializer.Serialize(stream, value, DeviceJson.SerializerOptions);

	public static void WriteJson<T>(this BinaryReader reader, T value) => WriteJson(value, reader.BaseStream);

	public static void WriteGuid(this BinaryWriter writer, Guid guid)
	{
		Span<byte> buffer = stackalloc byte[16];
		guid.TryWriteBytes(buffer);
		writer.Write(buffer);
	}
}
