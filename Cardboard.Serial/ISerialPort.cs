using Cranky;

namespace Cardboard.Serial;

public interface ISerialPort : IDisposable
{
	string Name { get; }

	/// <param name="clearReadBuffer">Clear the serial port's read buffer before beginning.</param>
	Task<Result<T, Exception?>> With<T>(
		Func<BinaryReader, BinaryWriter, Task<Result<T>>> action,
		bool clearReadBuffer,
		CancellationToken cancellationToken = default
	);

	bool IsOpen { get; }

	Task<Result<Unit, Exception>> Open(CancellationToken cancellationToken = default);
}

// public abstract record SerialMessage(byte? Token)
// {
// 	public static SerialMessage ReadFrom(BinaryReader reader, MappedMessageBitDepth deviceIndexBitDepth)
// 	{
// 		var header = Header.ReadFrom(reader);
// 		var token = header.ResponseRequested ? (byte?)reader.ReadByte() : null;
//
// 		return header.Type switch
// 		{
// 			ProtocolMessageType.Identify => SerialIdentifyMessage.ReadFrom(reader, token),
// 			ProtocolMessageType.Module_NoData
// 			or ProtocolMessageType.Module_U8
// 			or ProtocolMessageType.Module_S32
// 				=> SerialModuleMessage.ReadFrom(reader, token, deviceIndexBitDepth, header.Type),
// 			_ => throw new SerializationException("Unsupported message type."),
// 		};
// 	}
//
// 	public void WriteTo(BinaryWriter writer)
// 	{
// 		var responseRequested = Token.HasValue;
//
// 		var header = new Header(MessageType, responseRequested);
// 		header.WriteTo(writer);
//
// 		if (responseRequested)
// 			writer.Write(Token!.Value);
// 	}
//
// 	protected abstract void WriteDataTo(BinaryWriter writer);
//
// 	protected abstract ProtocolMessageType MessageType { get; }
// }
//
// public record SerialIdentifyMessage(byte? Token) : SerialMessage(Token)
// {
// 	public static SerialIdentifyMessage ReadFrom(BinaryReader reader, byte? token) => new(token);
//
// 	protected override void WriteDataTo(BinaryWriter writer) { }
//
// 	protected override ProtocolMessageType MessageType => ProtocolMessageType.Identify;
// }
//
// public record SerialModuleMessage(byte? Token, MappedModuleIndex Index, ReadOnlyMemory<byte> Data)
// 	: SerialMessage(Token)
// {
// 	public static SerialModuleMessage ReadFrom(
// 		BinaryReader reader,
// 		byte? token,
// 		MappedMessageBitDepth deviceIndexBitDepth,
// 		ProtocolMessageType messageType
// 	)
// 	{
// 		var length = messageType switch
// 		{
// 			ProtocolMessageType.Module_NoData => 0,
// 			ProtocolMessageType.Module_U8 => reader.ReadByte(),
// 			ProtocolMessageType.Module_S32 => reader.ReadInt32(),
// 			_
// 				=> throw new ArgumentOutOfRangeException(
// 					nameof(messageType),
// 					messageType,
// 					"Message type is not a supported module type."
// 				),
// 		};
//
// 		// todo: reduce allocations if this gets heavy use
// 		var data = length > 0 ? reader.ReadBytes(length) : [];
//
// 		return new(token, MappedModuleIndex.ReadFrom(reader, deviceIndexBitDepth), data);
// 	}
//
// 	protected override void WriteDataTo(BinaryWriter writer)
// 	{
// 		Index.WriteTo(writer);
//
// 		writer.Write(Data.Length);
// 		writer.Write(Data.Span);
// 	}
//
// 	protected override ProtocolMessageType MessageType =>
// 		Data.Length switch
// 		{
// 			<= 0 => ProtocolMessageType.Module_NoData,
// 			< byte.MaxValue => ProtocolMessageType.Module_U8,
// 			_ => ProtocolMessageType.Module_S32,
// 		};
// }
//
// internal readonly record struct Header(ProtocolMessageType Type, bool ResponseRequested)
// {
// 	// bits: [response requested: 1] [padding: 4] [message type: 3]
//
// 	private const int TypeMask = 0b0000_0111;
// 	private const int ResponseRequestedMask = 0b1000_0000;
//
// 	public static Header ReadFrom(BinaryReader reader)
// 	{
// 		var header = reader.ReadByte();
// 		var dataSize = (ProtocolMessageType)(header & TypeMask);
// 		var responseRequested = (header & ResponseRequestedMask) != 0;
//
// 		return new(dataSize, responseRequested);
// 	}
//
// 	public void WriteTo(BinaryWriter writer)
// 	{
// 		var header = (int)Type & TypeMask;
//
// 		if (ResponseRequested)
// 			header |= ResponseRequestedMask;
//
// 		writer.Write((byte)header);
// 	}
// }
//
// public enum ProtocolMessageType
// {
// 	Identify = 0,
// 	Module_NoData = 1,
// 	Module_U8 = 2,
// 	Module_S32 = 3,
// }
//
// public record SerialResponse(int Token, ReadOnlyRentedMemory Data) : IDisposable
// {
// 	public static SerialResponse ReadFrom(BinaryReader reader)
// 	{
// 		var token = reader.ReadByte();
// 		var length = reader.ReadInt32();
// 		var buffer = RentedMemory.Rent(length);
// 		reader.BaseStream.ReadExactly(buffer.Data.Span);
//
// 		return new(token, buffer);
// 	}
//
// 	public void WriteTo(BinaryWriter writer)
// 	{
// 		writer.Write(Token);
// 		writer.Write(Data.Data.Length);
// 		writer.Write(Data.Data.Span);
// 	}
//
// 	public void Dispose()
// 	{
// 		GC.SuppressFinalize(this);
// 		Data.Dispose();
// 	}
// }
