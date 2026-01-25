using StronglyTypedIds;

namespace Cardboard.Device;

public sealed class DeviceInfo : IReadable<DeviceInfo>
{
	public required DeviceId Id { get; init; }
	public required string Manufacturer { get; init; }
	public required DeviceTypeId Type { get; init; }
	public required string? Variant { get; init; }
	public required Version Version { get; init; }
	public required IReadOnlyList<CommandInfo> Commands { get; init; }

	public static DeviceInfo ReadFrom(BinaryReader reader)
	{
		var id = DeviceId.ReadFrom(reader);
		var manufacturer = reader.ReadStringU8();
		var type = DeviceTypeId.ReadFrom(reader);
		var variant = reader.ReadOptionRef(br => br.ReadStringU8());
		var version = FirmwareVersion.ReadFrom(reader).ToVersion();
		var commands = reader.ReadCollectionU8<CommandInfo>();

		return new()
		{
			Id = id,
			Manufacturer = manufacturer,
			Type = type,
			Variant = variant,
			Version = version,
			Commands = commands,
		};
	}
}

file readonly record struct FirmwareVersion(byte Major, byte Minor, byte Revision)
	: IReadable<FirmwareVersion>
{
	public static FirmwareVersion ReadFrom(BinaryReader reader)
	{
		var major = reader.ReadByte();
		var minor = reader.ReadByte();
		var revision = reader.ReadByte();
		return new(major, minor, revision);
	}

	public Version ToVersion() => new(Major, Minor, Revision);
}

public sealed class CommandInfo : IReadable<CommandInfo>
{
	public required CommandId Id { get; init; }
	public required string Name { get; init; }

	public static CommandInfo ReadFrom(BinaryReader reader)
	{
		var id = CommandId.ReadFrom(reader);
		var name = reader.ReadStringU8();

		return new() { Id = id, Name = name };
	}
}

/// <summary>
/// A globally unique identifier associated with a specific device (e.g. a serial number).
/// </summary>
[StronglyTypedId]
public readonly partial struct DeviceId : IReadable<DeviceId>
{
	public static DeviceId ReadFrom(BinaryReader reader)
	{
		var guid = reader.ReadGuid();
		return new(guid);
	}
}

// use to match with display-only information
[StronglyTypedId]
public readonly partial struct DeviceTypeId : IReadable<DeviceTypeId>
{
	public static DeviceTypeId ReadFrom(BinaryReader reader)
	{
		var guid = reader.ReadGuid();
		return new(guid);
	}
}

[StronglyTypedId]
public readonly partial struct CommandId : IReadable<CommandId>
{
	public static CommandId ReadFrom(BinaryReader reader)
	{
		var guid = reader.ReadGuid();
		return new(guid);
	}
}
