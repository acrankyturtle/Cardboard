using StronglyTypedIds;

namespace Cardboard.Device;

public sealed class DeviceInfo
{
	public required DeviceId Id { get; init; }
	public required string Name { get; init; }
	public string? Manufacturer { get; init; }
	public required DeviceTypeId Type { get; init; }
	public required IReadOnlyList<CommandInfo> Commands { get; init; }
}

public sealed class CommandInfo
{
	public required CommandId Id { get; init; }
	public required string Name { get; init; }
}

/// <summary>
/// A globally unique identifier associated with a specific device (e.g. a serial number).
/// </summary>
[StronglyTypedId]
public readonly partial struct DeviceId;

// use to match with display-only information
[StronglyTypedId]
public readonly partial struct DeviceTypeId;

[StronglyTypedId]
public readonly partial struct CommandId;
