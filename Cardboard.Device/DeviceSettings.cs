namespace Cardboard.Device;

public sealed class DeviceSettings : IReadable<DeviceSettings>, IWriteable
{
	private const uint Version = 1;

	/// <summary>
	/// Disable all mouse functionality. This can be useful when dealing with anti-cheat systems that disable additional mouse devices, such as Vanguard.
	/// </summary>
	public required bool MouseEnabled { get; init; }

	public static DeviceSettings ReadFrom(BinaryReader reader)
	{
		var version = reader.ReadUInt32();
		if (version != Version)
			throw new InvalidDataException($"Unsupported {nameof(DeviceSettings)} version: {version}");

		var isMouseEnabled = reader.ReadBoolean();

		return new() { MouseEnabled = isMouseEnabled };
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.Write(Version);
		writer.Write(MouseEnabled);
	}

	public static DeviceSettings CreateDefault() => new() { MouseEnabled = true };
}
