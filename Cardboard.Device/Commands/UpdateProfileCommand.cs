using Cranky;

namespace Cardboard.Device;

public sealed class UpdateProfileCommand : ICommand<DeviceProfile, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("45963fd8-73e2-50a0-ba69-69c3333dd8af");
	public CommandId Id => _id;

	public Unit Execute(DeviceProfile input, ICommandStream stream)
	{
		using var ms = new MemoryStream();
		using var writer = new BinaryWriter(ms);
		input.WriteTo(writer);
		writer.Flush();

		var profileData = ms.GetBuffer().AsSpan(0, (int)ms.Length);

		var length = profileData.Length;
		if (length > ushort.MaxValue)
			throw new InvalidOperationException(
				$"Profile is too large to send (size: {length} bytes, max: {ushort.MaxValue} bytes)."
			);

		stream.Writer.Write((ushort)length);
		stream.Writer.BaseStream.Write(profileData);
		stream.Writer.Flush();

		var ack = stream.Reader.ReadByte();
		if (ack != 0xFF)
			throw new InvalidOperationException(
				$"Failed to change profile. Received `0x{ack:x}` instead of expected `0xFF`."
			);

		return Unit.Value;
	}
}
