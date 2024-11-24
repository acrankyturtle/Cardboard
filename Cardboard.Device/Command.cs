using System.Text.Json;
using Cranky;

namespace Cardboard.Device;

public interface ICommandBase
{
	CommandId Id { get; }

	ReadOnlyMemory<byte> Data { get; }

	bool HasResponse { get; }
}

public interface ICommandNoResponse : ICommandBase
{
	bool ICommandBase.HasResponse => false;
}

public interface ICommandWithResponse<TResult> : ICommandBase
{
	Result<TResult> GetResult(ReadOnlySpan<byte> data);

	bool ICommandBase.HasResponse => true;
}

public sealed class IdentifyCommand : ICommandWithResponse<DeviceInfo>
{
	private static ReadOnlyMemory<byte> IdBytes { get; } = Enumerable.Repeat((byte)0xFF, 16).ToArray();
	public CommandId Id { get; } = new(new(IdBytes.Span));

	public ReadOnlyMemory<byte> Data => IdBytes;
	public bool WillAcknowledge => false;

	public Result<DeviceInfo> GetResult(ReadOnlySpan<byte> data) =>
		JsonSerializer.Deserialize<IdentifyResponse>(data) is { } response
			? Result.Success(response.Info)
			: Result.Fail();

	private class IdentifyResponse
	{
		public required DeviceInfo Info { get; init; }
	}
}

public class CommandImplementations<TMarker>(
	IExecuteCommand defaultImpl,
	IEnumerable<ICommandImplementation<TMarker>> implementations
)
{
	private IReadOnlyDictionary<CommandId, IExecuteCommand> Implementations { get; } =
		implementations.ToDictionary(x => x.Id, x => (IExecuteCommand)x);

	public async Task<Result<RentedMemory, Exception?>> Execute<TCommand>(
		TCommand command,
		BinaryReader reader,
		BinaryWriter writer
	)
		where TCommand : ICommandBase =>
		await Implementations.GetValueOrDefault(command.Id, defaultImpl).Execute(command, reader, writer);
}

public interface IExecuteCommand
{
	Task<Result<RentedMemory, Exception?>> Execute(
		ICommandBase command,
		BinaryReader reader,
		BinaryWriter writer
	);
}

public interface ICommandImplementation<TMarker> : IExecuteCommand
{
	CommandId Id { get; }
}

public interface ICommandImplementation<TMarker, in TCommand> : ICommandImplementation<TMarker>
	where TCommand : ICommandBase
{
	Task<Result<RentedMemory, Exception?>> Execute(
		TCommand command,
		BinaryReader reader,
		BinaryWriter writer
	);

	CommandId ICommandImplementation<TMarker>.Id => Id;

	Task<Result<RentedMemory, Exception?>> IExecuteCommand.Execute(
		ICommandBase command,
		BinaryReader reader,
		BinaryWriter writer
	) => Execute((TCommand)command, reader, writer);
}

public class DefaultCommandImplementation : IExecuteCommand
{
	public async Task<Result<RentedMemory, Exception?>> Execute(
		ICommandBase command,
		BinaryReader reader,
		BinaryWriter writer
	)
	{
		writer.Write(command.Data.Span);

		if (!command.HasResponse)
			return RentedMemory.Empty;

		var len = reader.ReadUInt16();
		var memory = RentedMemory.Rent(len);
		await reader.BaseStream.ReadExactlyAsync(memory.Data);

		return memory;
	}
}
