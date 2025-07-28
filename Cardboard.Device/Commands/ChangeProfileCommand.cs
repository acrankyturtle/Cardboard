using System.Text.Json;
using Cranky;

namespace Cardboard.Device;

public sealed class ChangeProfileCommand : ICommand<DeviceProfile, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("45963fd8-73e2-50a0-ba69-69c3333dd8af");
	public CommandId Id => _id;

	public Unit Execute(DeviceProfile input, ICommandStream stream)
	{
		var bytes = JsonSerializer.SerializeToUtf8Bytes(
			JsonDeviceProfile.From(input),
			DeviceJson.SerializerOptions
		);

		if (bytes.Length > ushort.MaxValue)
			throw new InvalidOperationException(
				$"Profile size {bytes.Length} exceeds maximum allowed size of {ushort.MaxValue} bytes."
			);

		stream.Writer.Write((ushort)bytes.Length);
		stream.Writer.Write(bytes);
		stream.Writer.Flush();

		// extend our read timeout because it's normal to wait for a response when sending large profiles
		var readTimeout = stream.Reader.BaseStream.ReadTimeout;
		try
		{
			stream.Reader.BaseStream.ReadTimeout = 60_000;

			var ack = stream.Reader.ReadByte();
			if (ack != 0xFF)
				throw new InvalidOperationException(
					$"Failed to change profile. Received `0x{ack:x}` instead of expected `0xFF`."
				);
		}
		finally
		{
			stream.Reader.BaseStream.ReadTimeout = readTimeout;
		}

		return Unit.Value;
	}
}
