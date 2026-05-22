using Cardboard.Device;
using Cardboard.Repositories;

namespace DeviceTool;

public static class ProfileBuilder
{
	public static Profile Build(
		string name,
		IEnumerable<Macro> macros,
		IEnumerable<Key> keys,
		IEnumerable<VirtualKey> virtualKeys
	)
	{
		var macrosList = macros.ToList();
		var keysList = keys.ToList();
		var virtualKeysList = virtualKeys.ToList();

		var missingMacroIds = GetMacrosInKeys(keysList, virtualKeysList)
			.Where(m => macrosList.All(x => x.Id != m))
			.ToList();

		if (missingMacroIds.Any())
			throw new InvalidOperationException(
				$"The following macros were not found in the provided macro list: {string.Join(", ", missingMacroIds)}"
			);

		var deviceProfile = new Profile
		{
			Name = name,
			Keys = keysList,
			VirtualKeys = virtualKeysList,
			Macros = macrosList,
		};

		return deviceProfile;
	}

	private static IEnumerable<MacroId> GetMacrosInKeys(
		IEnumerable<Key> keys,
		IEnumerable<VirtualKey> virtualKeys
	)
	{
		return keys.Select(x => x.Layers)
			.Concat(virtualKeys.Select(x => x.Layers))
			.SelectMany(x => x.Layers.SelectMany(tl => tl.Layer.Macros).Concat(x.DefaultLayer.Macros));
	}
}
