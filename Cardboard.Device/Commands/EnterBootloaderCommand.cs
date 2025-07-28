using Cranky;

namespace Cardboard.Device;

public sealed class EnterBootloaderCommand : ICommand<Unit, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("6dce0823-d199-5abb-a56f-a85cdba61842");
	public CommandId Id => _id;

	public Unit Execute(Unit input, ICommandStream stream)
	{
		return Unit.Value;
	}
}
