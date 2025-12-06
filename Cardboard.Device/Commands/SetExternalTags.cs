using Cranky;

namespace Cardboard.Device;

public sealed class SetExternalTags : ICommand<IReadOnlyCollection<LayerTag>, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("6d84630b-03ec-57f7-806e-b1c5dee4974d");
	public CommandId Id => _id;

	public Unit Execute(IReadOnlyCollection<LayerTag> input, ICommandStream stream)
	{
		stream.Writer.WriteCollectionU8(input);

		var ack = stream.Reader.ReadByte();

		if (ack != 0xFF)
			throw new InvalidOperationException(
				$"Failed to set tags. Received `0x{ack:x}` instead of `0xFF`."
			);

		return Unit.Value;
	}
}
