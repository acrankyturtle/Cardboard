using StronglyTypedIds;

namespace Cardboard.Device;

public record DeviceInfo(DeviceId Id, string Name, IReadOnlyCollection<ModuleInfo> Modules);

public record ModuleInfo(ModuleId Id, ModuleVersion Version, string Name);

/// <summary>
/// A globally unique identifier associated with a specific device.
/// </summary>
[StronglyTypedId]
public readonly partial struct DeviceId;

[StronglyTypedId]
public readonly partial struct ModuleId;

[StronglyTypedId(Template.String)]
public readonly partial struct ModuleVersion;
