using Cardboard.Device;

namespace DeviceTool;

public static class Utilities
{
	public static Macro BasicKeyMacro(MacroId id, string name, KeyboardKey key)
	{
		return new()
		{
			Id = id,
			Name = name,
			CutChannels = [],
			StartSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyDown = key } } }],
			},
			LoopSequence = new() { Actions = [] },
			EndSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyUp = key } } }],
			},
		};
	}

	public static DeviceLayers BasicKey(LayerId layerId, Macro macro) =>
		new()
		{
			DefaultLayer = new() { Id = layerId, Macros = [macro.Id] },
			Layers = [],
		};
}
