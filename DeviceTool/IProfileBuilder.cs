using Cardboard.Device;

namespace DeviceTool;

public interface IProfileBuilder
{
	DeviceProfile Build(DeviceId deviceId, string name, IdGenerator generator);
}

public class IdGenerator(int macroIdSeed, int layerIdSeed)
{
	private readonly GuidGenerator _macroIdGenerator = new(new(macroIdSeed));
	private readonly GuidGenerator _layerIdGenerator = new(new(layerIdSeed));

	public MacroId NewMacroId() => new(_macroIdGenerator.Next());

	public LayerId NewLayerId() => new(_layerIdGenerator.Next());

	public class GuidGenerator(Random rng)
	{
		public Guid Next()
		{
			Span<byte> buffer = stackalloc byte[16];
			rng.NextBytes(buffer);
			return new(buffer);
		}
	}
}
