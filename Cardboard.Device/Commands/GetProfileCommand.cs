using Cardboard.Utilities;

namespace Cardboard.Device;

public sealed class GetProfileCommand : ICommand<Unit, DeviceProfile>
{
	private static readonly CommandId _id = CommandId.Parse("e8dfdb54-f01c-5f79-9bb7-7d8d0c0c82d1");
	public CommandId Id => _id;

	public DeviceProfile Execute(Unit input, ICommandStream stream)
	{
		// check if profile is valid
		var isValid = stream.Reader.ReadByte() == 0xFF;
		var length = stream.Reader.ReadUInt16();

		var data = ReadProfileData();

		if (!isValid)
		{
			return new()
			{
				Name = "(empty)",
				Keys = [],
				VirtualKeys = [],
				Macros = [],
			};
		}

		var ms = new MemoryStream(data);
		var dataReader = new BinaryReader(ms);
		var profile = DeviceProfile.ReadFrom(dataReader);
		return profile;

		byte[] ReadProfileData()
		{
			// extend our read timeout because it's normal to wait for a response when sending large profiles
			var readTimeout = stream.Reader.BaseStream.ReadTimeout;
			try
			{
				stream.Reader.BaseStream.ReadTimeout = 60_000;
				return stream.Reader.ReadBytes(length);
			}
			finally
			{
				stream.Reader.BaseStream.ReadTimeout = readTimeout;
			}
		}
	}
}
