namespace Cardboard.Device;

public interface IReadable<out T>
{
	public static abstract T ReadFrom(BinaryReader reader);
}

public interface IWriteable
{
	public void WriteTo(BinaryWriter writer);
}

public static class ReaderExtensions
{
	public static List<T> ReadCollectionU8<T>(this BinaryReader reader)
		where T : IReadable<T>
	{
		var count = reader.ReadByte();
		var list = new List<T>(count);
		for (var i = 0; i < count; i++)
		{
			var item = T.ReadFrom(reader);
			list.Add(item);
		}

		return list;
	}

	public static List<T> ReadCollectionU16<T>(this BinaryReader reader)
		where T : IReadable<T>
	{
		var count = reader.ReadUInt16();
		var list = new List<T>(count);
		for (var i = 0; i < count; i++)
		{
			var item = T.ReadFrom(reader);
			list.Add(item);
		}

		return list;
	}

	public static Guid ReadGuid(this BinaryReader reader)
	{
		Span<byte> span = stackalloc byte[16];
		reader.BaseStream.ReadExactly(span);
		return new(span);
	}

	public static string ReadStringU8(this BinaryReader reader)
	{
		var length = reader.ReadByte();
		Span<byte> span = stackalloc byte[length];
		reader.BaseStream.ReadExactly(span);
		return System.Text.Encoding.UTF8.GetString(span);
	}

	public static T? ReadOption<T>(this BinaryReader reader, Func<BinaryReader, T> readValue)
		where T : struct
	{
		var hasValue = reader.ReadBoolean();
		return hasValue ? readValue(reader) : null;
	}
}

public static class WriterExtensions
{
	public static void WriteCollectionU8<T>(this BinaryWriter writer, IReadOnlyCollection<T> collection)
		where T : IWriteable
	{
		if (collection.Count > byte.MaxValue)
			throw new ArgumentOutOfRangeException(nameof(collection), "Collection count exceeds 255.");

		writer.Write((byte)collection.Count);
		foreach (var item in collection)
			item.WriteTo(writer);
	}

	public static void WriteCollectionU16<T>(this BinaryWriter writer, IReadOnlyCollection<T> collection)
		where T : IWriteable
	{
		if (collection.Count > ushort.MaxValue)
			throw new ArgumentOutOfRangeException(nameof(collection), "Collection count exceeds 65535.");

		writer.Write((ushort)collection.Count);
		foreach (var item in collection)
			item.WriteTo(writer);
	}

	public static void WriteGuid(this BinaryWriter writer, Guid guid)
	{
		Span<byte> span = stackalloc byte[16];
		guid.TryWriteBytes(span);
		writer.BaseStream.Write(span);
	}

	public static void WriteStringU8(this BinaryWriter writer, string value)
	{
		var length = System.Text.Encoding.UTF8.GetByteCount(value);
		if (length > byte.MaxValue)
			throw new ArgumentOutOfRangeException(nameof(value), "String length exceeds 255.");

		writer.Write((byte)length);
		Span<byte> span = stackalloc byte[length];
		System.Text.Encoding.UTF8.GetBytes(value, span);
		writer.BaseStream.Write(span);
	}

	public static void WriteOption<T>(this BinaryWriter writer, T? value)
		where T : IWriteable
	{
		if (value is null)
		{
			writer.Write(false);
		}
		else
		{
			writer.Write(true);
			value.WriteTo(writer);
		}
	}

	public static void WriteOption<T>(this BinaryWriter writer, T? value)
		where T : struct, IWriteable
	{
		if (value is { } v)
		{
			writer.Write(true);
			v.WriteTo(writer);
		}
		else
		{
			writer.Write(false);
		}
	}
}
