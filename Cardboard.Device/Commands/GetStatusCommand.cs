using System.Text.Json;
using Cranky;

namespace Cardboard.Device;

public sealed class GetStatusCommand : ICommand<Unit, DeviceStatus>
{
	private static readonly CommandId _id = CommandId.Parse("b14aadb5-53a2-5e69-b463-603efce7c199");
	public CommandId Id => _id;

	public DeviceStatus Execute(Unit input, ICommandStream stream)
	{
		var length = stream.Reader.ReadUInt16();
		var bytes = stream.Reader.ReadBytes(length);
		return JsonSerializer.Deserialize<DeviceStatus>(bytes, DeviceJson.SerializerOptions)
			?? throw new JsonException();
	}
}

public sealed class DeviceStatus
{
	public required ulong Now { get; init; }
	public required ulong AllocatorCurrent { get; init; }
	public required ulong AllocatorMax { get; init; }
	public required IReadOnlyCollection<DeviceError> Errors { get; init; }
}

public sealed class DeviceError
{
	public required ulong Timestamp { get; init; }
	public required string Message { get; init; }
}
