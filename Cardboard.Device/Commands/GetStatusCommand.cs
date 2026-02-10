using Cardboard.Utilities;

namespace Cardboard.Device;

public sealed class GetStatusCommand : ICommand<Unit, DeviceStatus>
{
	private static readonly CommandId _id = CommandId.Parse("b14aadb5-53a2-5e69-b463-603efce7c199");
	public CommandId Id => _id;

	public DeviceStatus Execute(Unit input, ICommandStream stream)
	{
		var status = DeviceStatus.ReadFrom(stream.Reader);
		return status;
	}
}

public sealed class DeviceStatus : IReadable<DeviceStatus>
{
	public required ulong Now { get; init; }
	public required ulong AllocatorCurrent { get; init; }
	public required ulong AllocatorMax { get; init; }
	public required IReadOnlyCollection<DeviceError> Errors { get; init; }

	public static DeviceStatus ReadFrom(BinaryReader reader)
	{
		var now = reader.ReadUInt64();
		var allocatorCurrent = reader.ReadUInt32();
		var allocatorMax = reader.ReadUInt32();
		var errors = reader.ReadCollectionU8<DeviceError>();

		return new()
		{
			Now = now,
			AllocatorCurrent = allocatorCurrent,
			AllocatorMax = allocatorMax,
			Errors = errors,
		};
	}
}

public sealed class DeviceError : IReadable<DeviceError>
{
	public required ulong Timestamp { get; init; }
	public required string Message { get; init; }

	public static DeviceError ReadFrom(BinaryReader reader)
	{
		var timestamp = reader.ReadUInt64();
		var message = reader.ReadStringU8();

		return new() { Timestamp = timestamp, Message = message };
	}
}
