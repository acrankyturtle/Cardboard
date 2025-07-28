using Cardboard.Device;

namespace DeviceTool;

public static class ProfileBuilder
{
	public static BuiltProfile Build(
		string name,
		IEnumerable<Macro> macros,
		IEnumerable<DeviceKey> keys,
		IEnumerable<VirtualKey> virtualKeys
	)
	{
		var macrosList = macros.ToList();
		var keysList = keys.ToList();
		var virtualKeysList = virtualKeys.ToList();

		if (!GetMacrosInKeys(keysList, virtualKeysList).All(m => macrosList.Any(x => x.Id == m)))
			throw new InvalidOperationException($"Not all macros in keys are defined in the macro list.");

		var deviceProfile = new DeviceProfile()
		{
			Keys = keysList,
			VirtualKeys = virtualKeysList,
			Macros = macrosList,
		};

		return new(name, deviceProfile);
	}

	private static IEnumerable<MacroId> GetMacrosInKeys(
		IEnumerable<DeviceKey> keys,
		IEnumerable<VirtualKey> virtualKeys
	)
	{
		return keys.Select(x => x.Layers)
			.Concat(virtualKeys.Select(x => x.Layers))
			.SelectMany(x => x.Layers.SelectMany(tl => tl.Layer.Macros).Concat(x.DefaultLayer.Macros));
	}
}

public record BuiltProfile(string Name, DeviceProfile Profile);
