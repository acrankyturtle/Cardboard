namespace Catboard.Device;

public readonly struct ModuleMessage(ModuleId moduleId, ModuleVersion version, ReadOnlyMemory<byte> data)
{
	public ModuleId ModuleId { get; } = moduleId;
	public ModuleVersion Version { get; } = version;
	public ReadOnlyMemory<byte> Data { get; } = data;
}
