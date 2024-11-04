using StronglyTypedIds;

namespace Cardboard.Device;

public class DeviceInfo
{
	public required DeviceId Id { get; init; }
	public required string Name { get; init; }
	public required string Manufacturer { get; init; }
	public required IReadOnlyCollection<CommandInfo> Commands { get; init; }
}

public class CommandInfo
{
	public required CommandId Id { get; init; }
	public required string Name { get; init; }
}

/// <summary>
/// A globally unique identifier associated with a specific device (e.g. a serial number).
/// </summary>
[StronglyTypedId]
public readonly partial struct DeviceId;

[StronglyTypedId]
public readonly partial struct CommandId;
