namespace Cardboard.Device;

public sealed record DeviceSettings : IReadable<DeviceSettings>, IWriteable
{
	private const uint CurrentVersion = 2;
	private const uint GamepadMinVersion = 2;

	public uint Version { get; init; } = CurrentVersion;

	/// <summary>
	/// Whether this device's firmware supports the gamepad setting. Older devices have no gamepad.
	/// </summary>
	public bool SupportsGamepad => Version >= GamepadMinVersion;

	/// <summary>
	/// Disable all mouse functionality. This can be useful when dealing with anti-cheat systems that disable additional mouse devices, such as Vanguard.
	/// </summary>
	public bool MouseEnabled { get; init; } = true;

	/// <summary>
	/// Disable the gamepad device. When disabled the device does not present a gamepad HID interface.
	/// </summary>
	public bool GamepadEnabled { get; init; } = true;

	public uint DebounceTimeUs { get; init; } = 10_000;

	public static DeviceSettings ReadFrom(BinaryReader reader)
	{
		var version = reader.ReadUInt32();
		return version switch
		{
			1 => ReadV1(reader),
			2 => ReadV2(reader),
			_ => throw new InvalidDataException($"Unsupported {nameof(DeviceSettings)} version: {version}"),
		};
	}

	private static DeviceSettings ReadV1(BinaryReader reader)
	{
		var isMouseEnabled = reader.ReadBoolean();
		var debounceTimeUs = reader.ReadUInt32();

		return new()
		{
			Version = 1,
			MouseEnabled = isMouseEnabled,
			DebounceTimeUs = debounceTimeUs,
		};
	}

	private static DeviceSettings ReadV2(BinaryReader reader)
	{
		var isMouseEnabled = reader.ReadBoolean();
		var isGamepadEnabled = reader.ReadBoolean();
		var debounceTimeUs = reader.ReadUInt32();

		return new()
		{
			Version = 2,
			MouseEnabled = isMouseEnabled,
			GamepadEnabled = isGamepadEnabled,
			DebounceTimeUs = debounceTimeUs,
		};
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.Write(Version);
		switch (Version)
		{
			case 1:
				WriteV1(writer);
				break;
			case 2:
				WriteV2(writer);
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

	private void WriteV2(BinaryWriter writer)
	{
		writer.Write(MouseEnabled);
		writer.Write(GamepadEnabled);
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
