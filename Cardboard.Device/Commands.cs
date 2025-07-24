using System.Text.Json;
using Cranky;
using StronglyTypedIds;

namespace Cardboard.Device;

public interface ICommand<in TIn, out TOut>
{
	CommandId Id { get; }

	TOut Execute(TIn input, ICommandStream stream, CancellationToken cancellationToken = default);
}

public static class Command
{
	public static CommandIndex? GetCommandIndex(DeviceInfo deviceInfo, CommandId commandId)
	{
		for (var i = 0; i < deviceInfo.Commands.Count; i++)
		{
			if (deviceInfo.Commands[i].Id == commandId)
				return new CommandIndex(i);
		}

		return null;
	}
}

public interface ICommandStream : IDisposable
{
	BinaryReader Reader { get; }

	BinaryWriter Writer { get; }

	void ClearReadBuffer();
}

[StronglyTypedId(Template.Int)]
public readonly partial struct CommandIndex;
