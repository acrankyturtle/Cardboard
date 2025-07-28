using System.Text;
using Cranky;

namespace Cardboard.Device;

public sealed class SetExternalTags : ICommand<IReadOnlyCollection<LayerTag>, Unit>
{
	private static readonly CommandId _id = CommandId.Parse("6d84630b-03ec-57f7-806e-b1c5dee4974d");
	public CommandId Id => _id;

	public Unit Execute(IReadOnlyCollection<LayerTag> input, ICommandStream stream)
	{
		if (input.Count > byte.MaxValue)
			throw new ArgumentException($"Too many tags. Maximum is {byte.MaxValue}.", nameof(input));

		stream.Writer.Write((byte)input.Count);
		foreach (var tag in input)
		{
			var utf8 = Encoding.UTF8.GetBytes(tag.Value);

			if (utf8.Length > byte.MaxValue)
				throw new ArgumentException($"Tag value '{tag.Value}' is too long.", nameof(input));

			stream.Writer.Write((byte)utf8.Length);
			stream.Writer.Write(utf8);
		}

		var ack = stream.Reader.ReadByte();

		if (ack != 0xFF)
			throw new InvalidOperationException(
				$"Failed to change profile. Received `0x{ack:x}` instead of `0xFF`."
			);

		return Unit.Value;
	}
}
