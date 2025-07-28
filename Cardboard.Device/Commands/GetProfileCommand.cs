using System.Text.Json;
using Cranky;

namespace Cardboard.Device;

public sealed class GetProfileCommand : ICommand<Unit, DeviceProfile>
{
	private static readonly CommandId _id = CommandId.Parse("e8dfdb54-f01c-5f79-9bb7-7d8d0c0c82d1");
	public CommandId Id => _id;

	public DeviceProfile Execute(Unit input, ICommandStream stream)
	{
		// check if profile is valid
		var isValid = stream.Reader.ReadByte() == 0xFF;

		if (!isValid)
			return new()
			{
				Keys = [],
				VirtualKeys = [],
				Macros = [],
			};

		// extend our read timeout because it's normal to wait for a response when sending large profiles
		var readTimeout = stream.Reader.BaseStream.ReadTimeout;
		try
		{
			stream.Reader.BaseStream.ReadTimeout = 60_000;

			var length = stream.Reader.ReadUInt16();
			var bytes = stream.Reader.ReadBytes(length);

			var profile =
				JsonSerializer.Deserialize<JsonDeviceProfile>(bytes, DeviceJson.SerializerOptions)
				?? throw new JsonException();

			return profile.ToDeviceProfile();
		}
		finally
		{
			stream.Reader.BaseStream.ReadTimeout = readTimeout;
		}
	}
}
