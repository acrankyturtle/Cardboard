namespace Cardboard.Device;

public readonly struct DeviceCommand(CommandId commandId, ReadOnlyMemory<byte> data)
{
	public CommandId CommandId { get; } = commandId;
	public ReadOnlyMemory<byte> Data { get; } = data;
}
