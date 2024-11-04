// using System.Runtime.Serialization;
// using Cranky;
//
// namespace Cardboard.Device;
//
// public sealed class CommandMap(IReadOnlyCollection<CommandInfo> modules, int startAt = 0)
// {
// 	private readonly IReadOnlyDualLookupDictionary<CommandId, MappedModuleIndex> _map = CreateMap(
// 		modules,
// 		startAt
// 	);
//
// 	public MappedModuleIndex? TryGet(CommandId id) =>
// 		_map.TryGetValue(new(id, version), out var index) ? index : null;
//
// 	public CommandId? TryGet(MappedModuleIndex index) =>
// 		_map.TryGetKey(index, out var key) ? key.Id, key.Version) : null;
//
// 	private static DualLookupDictionary<CommandId, MappedModuleIndex> CreateMap(
// 		IReadOnlyCollection<CommandInfo> modules,
// 		int startAt
// 	)
// 	{
// 		// calculate device's expected bit depth by checking how many modules it has
// 		var bitDepth = modules.Count switch
// 		{
// 			<= byte.MaxValue => MappedMessageBitDepth.U8Bit,
// 			<= ushort.MaxValue => MappedMessageBitDepth.U16Bit,
// 			_ => MappedMessageBitDepth.S32Bit,
// 		};
// 		return new DualLookupDictionary<CommandId, MappedModuleIndex>(
// 			modules.Select(
// 				(x, i) => new KeyValuePair<CommandId, MappedModuleIndex>(x.Id, new(i + startAt, bitDepth))
// 			)
// 		);
// 	}
// }
//
// public readonly record struct MappedModuleIndex(int Index, MappedMessageBitDepth BitDepth)
// {
// 	public static MappedModuleIndex ReadFrom(BinaryReader reader, MappedMessageBitDepth bitDepth) =>
// 		bitDepth switch
// 		{
// 			MappedMessageBitDepth.S32Bit => new(reader.ReadInt32(), bitDepth),
// 			MappedMessageBitDepth.U8Bit => new(reader.ReadByte(), bitDepth),
// 			MappedMessageBitDepth.U16Bit => new(reader.ReadUInt16(), bitDepth),
// 			_ => throw new SerializationException($"Unknown {nameof(MappedMessageBitDepth)}."),
// 		};
//
// 	public void WriteTo(BinaryWriter writer)
// 	{
// 		if (Index < 0)
// 			throw new SerializationException($"Negative index is not valid.");
//
// 		switch (BitDepth)
// 		{
// 			case MappedMessageBitDepth.S32Bit:
// 				writer.Write(Index);
// 				break;
// 			case MappedMessageBitDepth.U8Bit:
// 				if (Index > byte.MaxValue)
// 					throw new SerializationException(
// 						$"Index is too large for {nameof(MappedMessageBitDepth.U8Bit)}."
// 					);
// 				writer.Write((byte)Index);
// 				break;
// 			case MappedMessageBitDepth.U16Bit:
// 				if (Index > ushort.MaxValue)
// 					throw new SerializationException(
// 						$"Index is too large for {nameof(MappedMessageBitDepth.U16Bit)}."
// 					);
// 				writer.Write((ushort)Index);
// 				break;
// 			default:
// 				throw new SerializationException($"Unknown {nameof(MappedMessageBitDepth)}.");
// 		}
// 	}
// }
//
// public enum MappedMessageBitDepth
// {
// 	S32Bit = 0,
// 	U8Bit,
// 	U16Bit,
// }
