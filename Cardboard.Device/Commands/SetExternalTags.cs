using System.Text;
using Cranky;

namespace Cardboard.Device;

public sealed class SetExternalTags : ICommand<IReadOnlyCollection<LayerTag>, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("6d84630b-03ec-57f7-806e-b1c5dee4974d");
	public CommandId Id => _id;

	public Unit Execute(
		IReadOnlyCollection<LayerTag> input,
		ICommandStream stream,
		CancellationToken cancellationToken = default
	)
	{
		if (input.Any(x => Encoding.UTF8.GetByteCount(x.Value) > 255))
			throw new ArgumentException("Tag value is too long.", nameof(input));

		stream.Writer.Write((byte)input.Count);
		foreach (var tag in input)
		{
			var ut8 = Encoding.UTF8.GetBytes(tag.Value);
			stream.Writer.Write((byte)ut8.Length);
			stream.Writer.Write(ut8);
		}

		var ack = stream.Reader.ReadByte();

		if (ack != 0xFF)
			throw new InvalidOperationException(
				$"Failed to change profile. Received `0x{ack:x}` instead of `0xFF`."
			);

		return Unit.Value;
	}
}
