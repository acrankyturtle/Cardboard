using System.Text.Json;
using Cranky;

namespace Cardboard.Device;

public sealed class GetStatusCommand : ICommand<Unit, DeviceStatus>
{
	private static readonly CommandId _id = CommandId.Parse("b14aadb5-53a2-5e69-b463-603efce7c199");
	public CommandId Id => _id;

	public DeviceStatus Execute(
		Unit input,
		ICommandStream stream,
		CancellationToken cancellationToken = default
	)
	{
		var length = stream.Reader.ReadUInt16();
		var bytes = stream.Reader.ReadBytes(length);
		return JsonSerializer.Deserialize<DeviceStatus>(bytes, DeviceJson.SerializerOptions)
			?? throw new JsonException();
	}
}

public sealed class DeviceStatus
{
	public ulong AllocatorCurrent { get; init; }
	public ulong AllocatorMax { get; init; }
}
