namespace Cardboard.Device;

public sealed record DeviceSettings : IReadable<DeviceSettings>, IWriteable
{
	private const uint Version = 1;

	/// <summary>
	/// Disable all mouse functionality. This can be useful when dealing with anti-cheat systems that disable additional mouse devices, such as Vanguard.
	/// </summary>
	public required bool MouseEnabled { get; init; }

	public required uint DebounceTimeUs { get; init; }

	public static DeviceSettings ReadFrom(BinaryReader reader)
	{
		var version = reader.ReadUInt32();
		if (version != Version)
			throw new InvalidDataException($"Unsupported {nameof(DeviceSettings)} version: {version}");

		var isMouseEnabled = reader.ReadBoolean();
		var debounceTimeUs = reader.ReadUInt32();

		return new() { MouseEnabled = isMouseEnabled, DebounceTimeUs = debounceTimeUs };
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.Write(Version);
		writer.Write(MouseEnabled);
		writer.Write(DebounceTimeUs);
	}

	public static DeviceSettings CreateDefault() => new() { MouseEnabled = true, DebounceTimeUs = 10_000 };
}
