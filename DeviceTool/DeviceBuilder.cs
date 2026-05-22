using Cardboard.Device;
using Cardboard.Repositories;

namespace DeviceTool;

public static class DeviceBuilder
{
	public static IEnumerable<Key> Keys(
		IReadOnlyCollection<DeviceKeyId> keyIds,
		IReadOnlyCollection<KeyBindingLayers> deviceLayers
	)
	{
		if (keyIds.Count != deviceLayers.Count)
			throw new ArgumentException("Key IDs and device layers must have the same count.");

		return keyIds.Zip(deviceLayers).Select(x => new Key { Id = x.First, Layers = x.Second });
	}
}