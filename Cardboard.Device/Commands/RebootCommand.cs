using Cranky;

namespace Cardboard.Device;

public sealed class RebootCommand : ICommand<RebootParameters, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("6dce0823-d199-5abb-a56f-a85cdba61842");
	public CommandId Id => _id;

	public Unit Execute(RebootParameters input, ICommandStream stream)
	{
		const byte modeReboot = 0x10;
		const byte modeRebootToBootloader = 0x20;

		stream.Writer.Write(input.BootloaderMode ? modeRebootToBootloader : modeReboot);
		return Unit.Value;
	}
}

public sealed class RebootParameters
{
	public bool BootloaderMode { get; init; }
}
