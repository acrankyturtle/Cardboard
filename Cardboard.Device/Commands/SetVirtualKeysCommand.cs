using System.Diagnostics;
using Cardboard.Utilities;

namespace Cardboard.Device;

public abstract class SetVirtualKeysCommand : ICommand<IReadOnlyCollection<bool>, Unit>
{
	protected abstract int GetNumVirtualKeyBitfieldBytes { get; }

	public int NumberOfVirtualKeys => GetNumVirtualKeyBitfieldBytes * 8;
	public abstract CommandId Id { get; }

	private static readonly IReadOnlyCollection<SetVirtualKeysCommand> _instances =
	[
		new SetVirtualKeys8Command(),
		new SetVirtualKeys32Command(),
	];

	public Unit Execute(IReadOnlyCollection<bool> keyStates, ICommandStream stream)
	{
		if (keyStates.Count != GetNumVirtualKeyBitfieldBytes * 8)
			throw new ArgumentException(
				$"Expected exactly {GetNumVirtualKeyBitfieldBytes * 8} key states, but received {keyStates.Count}.",
				nameof(keyStates)
			);

		Span<byte> bitfield = stackalloc byte[GetNumVirtualKeyBitfieldBytes];
		KeyStatesToBitSet(bitfield, keyStates);
		stream.Writer.Write(bitfield);

		return Unit.Value;
	}

	public static SetVirtualKeysCommand? CreateFor(DeviceInfo device) =>
		_instances
			.Where(instance => device.Commands.Any(cmdInfo => cmdInfo.Id == instance.Id))
			.MaxBy(x => x.GetNumVirtualKeyBitfieldBytes);

	private static void KeyStatesToBitSet(Span<byte> output, IReadOnlyCollection<bool> keyStates)
	{
		if (keyStates.Count != output.Length * 8)
			throw new ArgumentException(
				$"Expected exactly {output.Length * 8} key states, but received {keyStates.Count}.",
				nameof(keyStates)
			);

		foreach (var (b, i) in keyStates.Chunk(8).Select((x, i) => (GetKeyStatesToByte(x), i)))
			output[i] = b;
	}

	private static byte GetKeyStatesToByte(IReadOnlyCollection<bool> keyStates)
	{
		Debug.Assert(keyStates.Count == 8, $"Expected exactly 8 key states, but received {keyStates.Count}.");

		return ReverseBits(
			(byte)
				keyStates
					.Select((state, index) => (state, index))
					.Where(x => x.state)
					.Aggregate(0, (a, x) => a | (1 << x.index))
		);
	}

	private static byte ReverseBits(byte b) =>
		(byte)(((((b * 0x0802LU) & 0x22110LU) | ((b * 0x8020LU) & 0x88440LU)) * 0x10101LU) >> 16);
}

public sealed class SetVirtualKeys8Command : SetVirtualKeysCommand
{
	public override CommandId Id { get; } = CommandId.Parse("162d99cc-5e8f-5879-97fc-c37fdb0f22a9");
	protected override int GetNumVirtualKeyBitfieldBytes => 1;
}

public sealed class SetVirtualKeys32Command : SetVirtualKeysCommand
{
	public override CommandId Id { get; } = CommandId.Parse("c1b2d3e4-f5a6-7b8c-9d0e-f1a2b3c4d5e6");
	protected override int GetNumVirtualKeyBitfieldBytes => 4;
}

public static class VirtualKeyHelper
{
	public static int GetVirtualKeyCount(DeviceInfo device) =>
		SetVirtualKeysCommand.CreateFor(device)?.NumberOfVirtualKeys ?? 0;
}
