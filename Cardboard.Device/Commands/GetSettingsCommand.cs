using Cardboard.Utilities;

namespace Cardboard.Device;

public class GetSettingsCommand : ICommand<Unit, DeviceSettings>
{
	private static readonly CommandId _id = CommandId.Parse("0062d411-70a5-55a5-a333-16706d62069f");
	public CommandId Id => _id;

	public DeviceSettings Execute(Unit input, ICommandStream stream)
	{
		var length = stream.Reader.ReadUInt16();

		// firmware versions >1.0.2 stamps default on initial boot
		// so if we get len == 0, we are dealing with a device version <1.0.2
		if (length == 0)
			return DeviceSettings.CreateLegacyDefault();

		var data = stream.Reader.ReadBytes(length);

		var ms = new MemoryStream(data);
		var dataReader = new BinaryReader(ms);
		var settings = DeviceSettings.ReadFrom(dataReader);
		return settings;
	}
}
