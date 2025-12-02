using Cardboard.Device;

namespace Cardboard.Repositories;

public record Profile
{
	public required string Name { get; init; }
	public required IReadOnlyCollection<Key> Keys { get; init; }
	public required IReadOnlyList<VirtualKey> VirtualKeys { get; init; }
	public required IReadOnlyList<Macro> Macros { get; init; }

	public DeviceProfile ToDevice()
	{
		var macrosInUse = Macros
			.Where(m =>
				Keys.Any(k => k.Layers.ContainsMacro(m.Id))
				|| VirtualKeys.Any(k => k.Layers.ContainsMacro(m.Id))
			)
			.ToList();
		return new()
		{
			Name = Name,
			Keys = Keys.Select(k => k.ToDevice(macrosInUse)).ToList(),
			VirtualKeys = VirtualKeys.Select(v => v.ToDevice(macrosInUse)).ToList(),
			Macros = macrosInUse,
		};
	}

	public static Profile FromDevice(DeviceProfile deviceProfile) =>
		new()
		{
			Name = deviceProfile.Name,
			Macros = deviceProfile.Macros,
			Keys = deviceProfile.Keys.Select(k => Key.FromDevice(k, deviceProfile.Macros)).ToList(),
			VirtualKeys = deviceProfile
				.VirtualKeys.Select(v => VirtualKey.FromDevice(v, deviceProfile.Macros))
				.ToList(),
		};
}

public record Key
{
	public required DeviceKeyId Id { get; init; }
	public required KeyBindingLayers Layers { get; init; }

	public DeviceKey ToDevice(IReadOnlyCollection<Macro> macros) =>
		new() { Id = Id, Layers = Layers.ToDevice(macros) };

	public static Key FromDevice(DeviceKey key, IReadOnlyList<Macro> macros) =>
		new() { Id = key.Id, Layers = KeyBindingLayers.FromDevice(key.Layers, macros) };
}

public record VirtualKey
{
	public required KeyBindingLayers Layers { get; init; }

	public DeviceVirtualKey ToDevice(IReadOnlyCollection<Macro> macros) =>
		new() { Layers = Layers.ToDevice(macros) };

	public static VirtualKey FromDevice(DeviceVirtualKey key, IReadOnlyList<Macro> macros) =>
		new() { Layers = KeyBindingLayers.FromDevice(key.Layers, macros) };
}

public record KeyBindingLayers
{
	public required IReadOnlyCollection<TaggedLayer> Layers { get; init; }
	public required Layer DefaultLayer { get; init; }

	public bool ContainsMacro(MacroId macroId) =>
		Layers.Any(l => l.Layer.Macros.Contains(macroId)) || DefaultLayer.Macros.Contains(macroId);

	public DeviceLayers ToDevice(IReadOnlyCollection<Macro> macros) =>
		new()
		{
			Layers = Layers.Select(l => l.ToDevice(macros)).ToArray(),
			DefaultLayer = DefaultLayer.ToDevice(macros),
		};

	public static KeyBindingLayers FromDevice(DeviceLayers layers, IReadOnlyList<Macro> macros) =>
		new()
		{
			Layers = layers.Layers.Select(l => TaggedLayer.FromDevice(l, macros)).ToList(),
			DefaultLayer = Layer.FromDevice(layers.DefaultLayer, macros),
		};
}

public record TaggedLayer
{
	public required IReadOnlyCollection<LayerTag> Tags { get; init; }
	public required TagMatchType MatchType { get; init; }
	public required Layer Layer { get; init; }

	public TaggedDeviceKeyLayer ToDevice(IReadOnlyCollection<Macro> macros) =>
		new()
		{
			Tags = Tags,
			MatchType = MatchType,
			Layer = Layer.ToDevice(macros),
		};

	public static TaggedLayer FromDevice(TaggedDeviceKeyLayer layer, IReadOnlyList<Macro> macros) =>
		new()
		{
			Tags = layer.Tags,
			MatchType = layer.MatchType,
			Layer = Layer.FromDevice(layer.Layer, macros),
		};
}

public record Layer
{
	public required LayerId Id { get; init; }
	public required IReadOnlyCollection<MacroId> Macros { get; init; }

	public DeviceKeyLayer ToDevice(IReadOnlyCollection<Macro> macros) =>
		new()
		{
			Id = Id,
			Macros = Macros
				.Select(m =>
					macros
						.Index()
						.Where(x => x.Item.Id == m)
						.Select(x => new MacroIndex?(new((ushort)x.Index)))
						.FirstOrDefault()
					?? throw new KeyNotFoundException($"Macro {m} not found in profile.")
				)
				.ToList(),
		};

	public static Layer FromDevice(DeviceKeyLayer layer, IReadOnlyList<Macro> macros) =>
		new() { Id = layer.Id, Macros = layer.Macros.Select(i => macros[i.Value].Id).ToList() };
}
