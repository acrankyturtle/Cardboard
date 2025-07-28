using StronglyTypedIds;

namespace Cardboard.Device;

public interface ICommand<in TIn, out TOut>
{
	CommandId Id { get; }

	TOut Execute(TIn input, ICommandStream stream);
}

public static class Command
{
	public static CommandIndex? GetCommandIndex(DeviceInfo deviceInfo, CommandId commandId) =>
		deviceInfo
			.Commands.Select((c, i) => (c, i))
			.Where(x => x.c.Id == commandId)
			.Select(x => new CommandIndex(x.i))
			.SingleOrDefault();
}

public interface ICommandStream : IDisposable
{
	BinaryReader Reader { get; }

	BinaryWriter Writer { get; }

	void ClearReadBuffer();
}

[StronglyTypedId(Template.Int)]
public readonly partial struct CommandIndex;
