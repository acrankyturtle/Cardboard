namespace Cardboard.Serial;



//
// public static class SerialMessageProtocol
// {
// 	public static SerialMessage ReadFrom(BinaryReader reader)
// 	{
// 		var header = SerialResponseHeader.ReadFrom(reader);
//
// 		if (!header.IsResponse)
// 		{
// 			throw new SerializationException(
// 				"Non-response messages from device are currently not supported."
// 			);
// 		}
//
// 		var responseId = SerialResponseData.ReadFrom(reader).Id;
//
// 		var dataLength = SerialResponseDataMessageLength.ReadFrom(reader, header.Data).Length;
// 		var dataMessage = SerialResponseDataMessage.ReadFrom(reader, dataLength);
// 	}
//
// 	public static void WriteTo(SerialMessage message, BinaryWriter writer) { }
// }
//
// internal readonly record struct SerialResponseHeader(bool IsResponse, SerialResponseHeader.DataType Data)
// {
// 	public static SerialResponseHeader ReadFrom(BinaryReader reader)
// 	{
// 		var headerByte = reader.ReadByte();
//
// 		var i = 0;
// 		var isResponse = BitReader.Read(headerByte, ref i, 1) == 1;
// 		var dataIncluded = (DataType)BitReader.Read(headerByte, ref i, 2);
//
// 		return new(isResponse, dataIncluded);
// 	}
//
// 	public void WriteTo(BinaryWriter writer)
// 	{
// 		var headerByte = new BitWriter(0, 0).Write(IsResponse ? 1 : 0, 1).Write((byte)Data, 2).Data;
// 		writer.Write(headerByte);
// 	}
//
// 	public enum DataType : byte
// 	{
// 		None = 0,
// 		Data8BitUnsigned = 1,
// 		Data16BitUnsigned = 2,
// 		Data32Bit = 3,
// 	}
// }
//
// internal readonly record struct SerialResponseData(int Id)
// {
// 	public static SerialResponseData ReadFrom(BinaryReader reader) => new(reader.ReadInt32());
//
// 	public void WriteTo(BinaryWriter writer) => writer.Write(Id);
// }
//
// internal readonly record struct SerialResponseDataMessageLength(int Length)
// {
// 	public static SerialResponseDataMessageLength ReadFrom(
// 		BinaryReader reader,
// 		SerialResponseHeader.DataType type
// 	) =>
// 		type switch
// 		{
// 			SerialResponseHeader.DataType.Data8BitUnsigned => new(reader.ReadByte()),
// 			SerialResponseHeader.DataType.Data16BitUnsigned => new(reader.ReadUInt16()),
// 			SerialResponseHeader.DataType.Data32Bit => new(reader.ReadInt32()),
// 			_ => new(0),
// 		};
// }
//
// internal readonly struct SerialResponseDataMessage(Buffer data) : IDisposable
// {
// 	public Buffer Data => data;
//
// 	public static SerialResponseDataMessage ReadFrom(BinaryReader reader, int length)
// 	{
// 		if (length < 1)
// 			return new();
//
// 		var memoryOwner = MemoryPool<byte>.Shared.Rent(length);
// 		var memory = memoryOwner.Memory[..length];
// 		reader.BaseStream.ReadExactly(memory.Span);
//
// 		var buffer = new Buffer(memory, memoryOwner.Dispose);
//
// 		return new(buffer);
// 	}
//
// 	public void Dispose()
// 	{
// 		data.Dispose();
// 	}
// }
