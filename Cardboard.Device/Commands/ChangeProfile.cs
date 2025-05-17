using System.Text.Json;
using Cranky;

namespace Cardboard.Device;

public sealed class ChangeProfileCommand : ICommand<DeviceProfile, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("45963fd8-73e2-50a0-ba69-69c3333dd8af");
	public CommandId Id => _id;

	public Unit Execute(DeviceProfile input, ICommandStream stream, CancellationToken cancellationToken)
	{
		var bytes = JsonSerializer.SerializeToUtf8Bytes(
			JsonDeviceProfile.From(input),
			DeviceJson.SerializerOptions
		);

		stream.Writer.Write((ushort)bytes.Length);
		stream.Writer.Write(bytes);
		stream.Writer.Flush();

		var ack = stream.Reader.ReadByte();

		if (ack != 0xFF)
			throw new InvalidOperationException(
				$"Failed to change profile. Received `0x{ack:x}` instead of `0xFF`."
			);

		return Unit.Value;
	}
}
