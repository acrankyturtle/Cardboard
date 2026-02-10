using Cardboard.Utilities;

namespace Cardboard.Device;

public class UpdateSettingsCommand : ICommand<DeviceSettings, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("a2460f18-32a8-5e57-b8c7-7adac7a096bd");
	public CommandId Id => _id;

	public Unit Execute(DeviceSettings input, ICommandStream stream)
	{
		using var ms = new MemoryStream();
		using var writer = new BinaryWriter(ms);
		input.WriteTo(writer);
		writer.Flush();

		var settingsData = ms.GetBuffer().AsSpan(0, (int)ms.Length);

		var length = settingsData.Length;
		if (length > ushort.MaxValue)
			throw new InvalidOperationException(
				$"Settings object is too large to send (size: {length} bytes, max: {ushort.MaxValue} bytes)."
			);

		stream.Writer.Write((ushort)length);
		stream.Writer.BaseStream.Write(settingsData);
		stream.Writer.Flush();

		var ack = stream.Reader.ReadByte();
		if (ack != 0xFF)
			throw new InvalidOperationException(
				$"Failed to change settings. Received `0x{ack:x}` instead of expected `0xFF`."
			);

		return Unit.Value;
	}
}
