namespace Cardboard.Device;

public sealed record DeviceSettings : IReadable<DeviceSettings>, IWriteable
{
	private const uint CurrentVersion = 2;

	public uint Version { get; init; } = CurrentVersion;

	/// <summary>
	/// Disable all mouse functionality. This can be useful when dealing with anti-cheat systems that disable additional mouse devices, such as Vanguard.
	/// </summary>
	public bool MouseEnabled { get; init; } = true;

	public uint DebounceTimeUs { get; init; } = 10_000;

	public static DeviceSettings ReadFrom(BinaryReader reader)
	{
		var version = reader.ReadUInt32();
		return version switch
		{
			1 => ReadV1(reader),
			_ => throw new InvalidDataException($"Unsupported {nameof(DeviceSettings)} version: {version}"),
		};
	}

	private static DeviceSettings ReadV1(BinaryReader reader)
	{
		var isMouseEnabled = reader.ReadBoolean();
		var debounceTimeUs = reader.ReadUInt32();

		return new() { MouseEnabled = isMouseEnabled, DebounceTimeUs = debounceTimeUs };
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.Write(Version);
		switch (Version)
		{
			case 1:
				WriteV1(writer);
				break;
			default:
				throw new InvalidOperationException(
					$"Cannot write unsupported {nameof(DeviceSettings)} version: {Version}"
				);
		}
	}

	private void WriteV1(BinaryWriter writer)
	{
		writer.Write(MouseEnabled);
		writer.Write(DebounceTimeUs);
	}

	public static DeviceSettings CreateLegacyDefault() =>
		new()
		{
			Version = 1,
			MouseEnabled = true,
			DebounceTimeUs = 10_000,
		};
}
