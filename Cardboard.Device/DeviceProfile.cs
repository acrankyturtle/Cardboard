using System.Text.Json;
using System.Text.Json.Serialization;
using StronglyTypedIds;

namespace Cardboard.Device;

public sealed class DeviceProfile
{
	public required IReadOnlyCollection<DeviceKey> Keys { get; init; }
	public required IReadOnlyCollection<VirtualKey> VirtualKeys { get; init; }
	public required IReadOnlyCollection<Macro> Macros { get; init; }
}

public sealed class DeviceKey
{
	public required DeviceKeyId Id { get; init; }
	public required DeviceLayers Layers { get; init; }
}

public sealed class VirtualKey
{
	public required DeviceLayers Layers { get; init; }
}

public sealed class DeviceLayers
{
	public IReadOnlyCollection<TaggedDeviceKeyLayer> Layers { get; init; } = [];
	public required DeviceKeyLayer DefaultLayer { get; init; }
}

public sealed class TaggedDeviceKeyLayer
{
	public required DeviceKeyLayer Layer { get; init; }
	public IReadOnlyCollection<LayerTag> Tags { get; init; } = [];
	public required TagMatchType MatchType { get; init; }
}

public sealed class DeviceKeyLayer
{
	public required LayerId Id { get; init; }
	public required IReadOnlyCollection<MacroId> Macros { get; init; }
}

public enum TagMatchType
{
	All,
	Any,
}

public sealed class Macro
{
	public required MacroId Id { get; init; }
	public required string Name { get; init; }
	public Channel? PlayChannel { get; init; }
	public required IReadOnlyCollection<Channel> CutChannels { get; init; }
	public required Sequence StartSequence { get; init; }
	public required Sequence LoopSequence { get; init; }
	public required Sequence EndSequence { get; init; }
}

public sealed class Sequence
{
	public required IReadOnlyCollection<Action> Actions { get; init; }
}

public sealed class Action
{
	public ulong PredelayMs { get; init; }
	public required ActionEvent ActionEvent { get; init; }
}

public sealed class ActionEvent
{
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public KeyboardActionEvent? Keyboard { get; init; }

	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public MouseActionEvent? Mouse { get; init; }

	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public ConsumerControlEvent? ConsumerControl { get; init; }

	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public LayerActionEvent? Layer { get; init; }

	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public DebugActionEvent? Debug { get; init; }

	public sealed class KeyboardActionEvent
	{
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public KeyboardKey? KeyDown { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public KeyboardKey? KeyUp { get; init; }
	}

	public sealed class MouseActionEvent
	{
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public MouseButton? ButtonDown { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public MouseButton? ButtonUp { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public (int X, int Y)? Scroll { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public (int X, int Y)? Move { get; init; }
	}

	public sealed class LayerActionEvent
	{
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public LayerTag? Clear { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public LayerTag? Set { get; init; }
	}

	public sealed class DebugActionEvent
	{
		public required string Log { get; init; }
	}
}

[StronglyTypedId]
public readonly partial struct DeviceKeyId;

[StronglyTypedId]
public readonly partial struct LayerId;

[StronglyTypedId(Template.String)]
public readonly partial struct LayerTag;

[StronglyTypedId]
public readonly partial struct MacroId;

[StronglyTypedId]
public readonly partial struct Channel;

public enum KeyboardKey
{
	A = 0x04,
	B = 0x05,
	C = 0x06,
	D = 0x07,
	E = 0x08,
	F = 0x09,
	G = 0x0A,
	H = 0x0B,
	I = 0x0C,
	J = 0x0D,
	K = 0x0E,
	L = 0x0F,
	M = 0x10,
	N = 0x11,
	O = 0x12,
	P = 0x13,
	Q = 0x14,
	R = 0x15,
	S = 0x16,
	T = 0x17,
	U = 0x18,
	V = 0x19,
	W = 0x1A,
	X = 0x1B,
	Y = 0x1C,
	Z = 0x1D,
	ONE = 0x1E,
	TWO = 0x1F,
	THREE = 0x20,
	FOUR = 0x21,
	FIVE = 0x22,
	SIX = 0x23,
	SEVEN = 0x24,
	EIGHT = 0x25,
	NINE = 0x26,
	ZERO = 0x27,
	ENTER = 0x28,
	ESCAPE = 0x29,
	BACKSPACE = 0x2A,
	TAB = 0x2B,
	SPACEBAR = 0x2C,
	MINUS = 0x2D,
	EQUALS = 0x2E,
	LEFT_BRACKET = 0x2F,
	RIGHT_BRACKET = 0x30,
	BACKSLASH = 0x31,
	POUND = 0x32,
	SEMICOLON = 0x33,
	QUOTE = 0x34,
	GRAVE_ACCENT = 0x35,
	COMMA = 0x36,
	PERIOD = 0x37,
	FORWARD_SLASH = 0x38,
	CAPS_LOCK = 0x39,
	F1 = 0x3A,
	F2 = 0x3B,
	F3 = 0x3C,
	F4 = 0x3D,
	F5 = 0x3E,
	F6 = 0x3F,
	F7 = 0x40,
	F8 = 0x41,
	F9 = 0x42,
	F10 = 0x43,
	F11 = 0x44,
	F12 = 0x45,
	PRINT_SCREEN = 0x46,
	SCROLL_LOCK = 0x47,
	PAUSE = 0x48,
	INSERT = 0x49,
	HOME = 0x4A,
	PAGE_UP = 0x4B,
	DELETE = 0x4C,
	END = 0x4D,
	PAGE_DOWN = 0x4E,
	RIGHT_ARROW = 0x4F,
	LEFT_ARROW = 0x50,
	DOWN_ARROW = 0x51,
	UP_ARROW = 0x52,
	KEYPAD_NUMLOCK = 0x53,
	KEYPAD_FORWARD_SLASH = 0x54,
	KEYPAD_ASTERISK = 0x55,
	KEYPAD_MINUS = 0x56,
	KEYPAD_PLUS = 0x57,
	KEYPAD_ENTER = 0x58,
	KEYPAD_ONE = 0x59,
	KEYPAD_TWO = 0x5A,
	KEYPAD_THREE = 0x5B,
	KEYPAD_FOUR = 0x5C,
	KEYPAD_FIVE = 0x5D,
	KEYPAD_SIX = 0x5E,
	KEYPAD_SEVEN = 0x5F,
	KEYPAD_EIGHT = 0x60,
	KEYPAD_NINE = 0x61,
	KEYPAD_ZERO = 0x62,
	KEYPAD_PERIOD = 0x63,
	KEYPAD_BACKSLASH = 0x64,
	APPLICATION = 0x65,

	//POWER = 0x66,
	KEYPAD_EQUALS = 0x67,
	F13 = 0x68,
	F14 = 0x69,
	F15 = 0x6A,
	F16 = 0x6B,
	F17 = 0x6C,
	F18 = 0x6D,
	F19 = 0x6E,
	F20 = 0x6F,
	F21 = 0x70,
	F22 = 0x71,
	F23 = 0x72,
	F24 = 0x73,

	MENU = 0x76,

	LEFT_CONTROL = 0xE0,
	LEFT_SHIFT = 0xE1,
	LEFT_ALT = 0xE2,
	LEFT_GUI = 0xE3,
	RIGHT_CONTROL = 0xE4,
	RIGHT_SHIFT = 0xE5,
	RIGHT_ALT = 0xE6,
	RIGHT_GUI = 0xE7,
}

public enum MouseButton
{
	Left,
	Right,
	Middle,
	Back,
	Forward,
}

public enum ConsumerControlEvent
{
	RECORD = 0xB2,
	FAST_FORWARD = 0xB3,
	REWIND = 0xB4,
	SCAN_NEXT_TRACK = 0xB5,
	SCAN_PREVIOUS_TRACK = 0xB6,
	STOP = 0xB7,
	EJECT = 0xB8,
	PLAY_PAUSE = 0xCD,
	MUTE = 0xE2,
	VOLUME_DECREMENT = 0xEA,
	VOLUME_INCREMENT = 0xE9,
}

public sealed class JsonDeviceProfile
{
	public required IReadOnlyCollection<JsonDeviceKey> Keys { get; init; }

	public required IReadOnlyCollection<JsonVirtualKey> VirtualKeys { get; init; } = [];

	public required IReadOnlyCollection<JsonMacro> Macros { get; init; }

	public DeviceProfile ToDeviceProfile()
	{
		var macros = Macros.Select(x => x.ToMacro()).ToList();
		return new()
		{
			Keys = Keys.Select(x => x.ToDeviceKey(macros)).ToList(),
			VirtualKeys = VirtualKeys.Select(x => x.ToVirtualKey(macros)).ToList(),
			Macros = macros,
		};
	}

	public static JsonDeviceProfile From(DeviceProfile profile) =>
		new()
		{
			Keys = profile.Keys.Select(x => JsonDeviceKey.From(x, profile.Macros.ToList())).ToList(),
			VirtualKeys = profile
				.VirtualKeys
				.Select(x => JsonVirtualKey.From(x, profile.Macros.ToList()))
				.ToList(),
			Macros = profile.Macros.Select(JsonMacro.From).ToList(),
		};
}

public sealed class JsonDeviceKey
{
	public required DeviceKeyId Id { get; init; }
	public required JsonDeviceLayers Layers { get; init; }

	public DeviceKey ToDeviceKey(IReadOnlyList<Macro> macros) =>
		new() { Id = Id, Layers = Layers.ToDeviceLayers(macros), };

	public static JsonDeviceKey From(DeviceKey key, IReadOnlyList<Macro> macros) =>
		new() { Id = key.Id, Layers = JsonDeviceLayers.From(key.Layers, macros), };
}

public sealed class JsonVirtualKey
{
	public required JsonDeviceLayers Layers { get; init; }

	public VirtualKey ToVirtualKey(IReadOnlyList<Macro> macros) =>
		new() { Layers = Layers.ToDeviceLayers(macros), };

	public static JsonVirtualKey From(VirtualKey key, IReadOnlyList<Macro> macros) =>
		new() { Layers = JsonDeviceLayers.From(key.Layers, macros), };
}

public sealed class JsonDeviceLayers
{
	public IReadOnlyCollection<JsonTaggedDeviceKeyLayer> Layers { get; init; } = [];
	public required JsonDeviceKeyLayer DefaultLayer { get; init; }

	public DeviceLayers ToDeviceLayers(IReadOnlyList<Macro> macros) =>
		new()
		{
			Layers = Layers.Select(x => x.ToTaggedDeviceKeyLayer(macros)).ToList(),
			DefaultLayer = DefaultLayer.ToDeviceKeyLayer(macros),
		};

	public static JsonDeviceLayers From(DeviceLayers layers, IReadOnlyList<Macro> macros) =>
		new()
		{
			Layers = layers.Layers.Select(x => JsonTaggedDeviceKeyLayer.From(x, macros)).ToList(),
			DefaultLayer = JsonDeviceKeyLayer.From(layers.DefaultLayer, macros),
		};
}

public sealed class JsonTaggedDeviceKeyLayer
{
	public required JsonDeviceKeyLayer Layer { get; init; }
	public IReadOnlyCollection<LayerTag> Tags { get; init; } = [];
	public required TagMatchType MatchType { get; init; }

	public TaggedDeviceKeyLayer ToTaggedDeviceKeyLayer(IReadOnlyList<Macro> macros) =>
		new()
		{
			Layer = Layer.ToDeviceKeyLayer(macros),
			Tags = Tags,
			MatchType = MatchType,
		};

	public static JsonTaggedDeviceKeyLayer From(TaggedDeviceKeyLayer layer, IReadOnlyList<Macro> macros) =>
		new()
		{
			Layer = JsonDeviceKeyLayer.From(layer.Layer, macros),
			Tags = layer.Tags,
			MatchType = layer.MatchType,
		};
}

public sealed class JsonDeviceKeyLayer
{
	public required LayerId Id { get; init; }
	public required IReadOnlyCollection<int> Macros { get; init; }

	public DeviceKeyLayer ToDeviceKeyLayer(IReadOnlyList<Macro> macros) =>
		new() { Id = Id, Macros = Macros.Select(x => macros[x].Id).ToList() };

	public static JsonDeviceKeyLayer From(DeviceKeyLayer layer, IReadOnlyList<Macro> macros) =>
		new()
		{
			Id = layer.Id,
			Macros = layer
				.Macros
				.Select(m => macros.Index().FirstOrDefault(x => x.Item.Id == m).Index)
				.ToList(),
		};
}

public sealed class JsonMacro
{
	public required MacroId Id { get; init; }
	public required string Name { get; init; }
	public Channel? PlayChannel { get; init; }
	public required IReadOnlyCollection<Channel> CutChannels { get; init; }
	public required JsonSequence StartSequence { get; init; }
	public required JsonSequence LoopSequence { get; init; }
	public required JsonSequence EndSequence { get; init; }

	public Macro ToMacro() =>
		new()
		{
			Id = Id,
			Name = Name,
			PlayChannel = PlayChannel,
			CutChannels = CutChannels,
			StartSequence = StartSequence.ToSequence(),
			LoopSequence = LoopSequence.ToSequence(),
			EndSequence = EndSequence.ToSequence(),
		};

	public static JsonMacro From(Macro macro) =>
		new()
		{
			Id = macro.Id,
			Name = macro.Name,
			PlayChannel = macro.PlayChannel,
			CutChannels = macro.CutChannels,
			StartSequence = JsonSequence.From(macro.StartSequence),
			LoopSequence = JsonSequence.From(macro.LoopSequence),
			EndSequence = JsonSequence.From(macro.EndSequence),
		};
}

public sealed class JsonSequence
{
	public required IReadOnlyCollection<JsonAction> Actions { get; init; }

	public Sequence ToSequence() =>
		new()
		{
			Actions = Actions
				.Select(
					x =>
						new Action { PredelayMs = x.PredelayMs, ActionEvent = x.ActionEvent.ToActionEvent(), }
				)
				.ToList(),
		};

	public static JsonSequence From(Sequence seq) =>
		new() { Actions = seq.Actions.Select(JsonAction.From).ToList(), };
}

public sealed class JsonAction
{
	public ulong PredelayMs { get; init; }
	public required JsonActionEvent ActionEvent { get; init; }

	public Action ToAction() => new() { PredelayMs = PredelayMs, ActionEvent = ActionEvent.ToActionEvent(), };

	public static JsonAction From(Action action) =>
		new() { PredelayMs = action.PredelayMs, ActionEvent = JsonActionEvent.From(action.ActionEvent), };
}

public sealed class JsonActionEvent
{
	[JsonPropertyName("Keyboard")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public JsonKeyboardActionEvent? Keyboard { get; init; }

	[JsonPropertyName("Mouse")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public JsonMouseActionEvent? Mouse { get; init; }

	[JsonPropertyName("ConsumerControl")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public ConsumerControlEvent? ConsumerControl { get; init; }

	[JsonPropertyName("Layer")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public JsonLayerActionEvent? Layer { get; init; }

	[JsonPropertyName("Debug")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
	public ActionEvent.DebugActionEvent? Debug { get; init; }

	public ActionEvent ToActionEvent() =>
		new()
		{
			Keyboard = Keyboard?.ToKeyboardActionEvent(),
			Mouse = Mouse?.ToMouseActionEvent(),
			ConsumerControl = ConsumerControl,
			Layer = Layer?.ToLayerActionEvent(),
			Debug = Debug,
		};

	public static JsonActionEvent From(ActionEvent e)
	{
		if (
			((object?[])[e.Keyboard, e.Mouse, e.ConsumerControl, e.Layer, e.Debug]).Count(x => x is not null)
			> 1
		)
		{
			throw new JsonException("Only one action event type can be set.");
		}

		return new()
		{
			Keyboard = e.Keyboard is not null ? JsonKeyboardActionEvent.From(e.Keyboard) : null,
			Mouse = e.Mouse is not null ? JsonMouseActionEvent.From(e.Mouse) : null,
			ConsumerControl = e.ConsumerControl,
			Layer = e.Layer is not null ? JsonLayerActionEvent.From(e.Layer) : null,
			Debug = e.Debug,
		};
	}

	public sealed class JsonKeyboardActionEvent
	{
		[JsonPropertyName("KeyDown")]
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public KeyboardKey? KeyDown { get; init; }

		[JsonPropertyName("KeyUp")]
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public KeyboardKey? KeyUp { get; init; }

		public ActionEvent.KeyboardActionEvent ToKeyboardActionEvent() =>
			new() { KeyDown = KeyDown, KeyUp = KeyUp, };

		public static JsonKeyboardActionEvent From(ActionEvent.KeyboardActionEvent e) =>
			new() { KeyDown = e.KeyDown, KeyUp = e.KeyUp, };
	}

	public sealed class JsonMouseActionEvent
	{
		[JsonPropertyName("ButtonDown")]
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public MouseButton? ButtonDown { get; init; }

		[JsonPropertyName("ButtonUp")]
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public MouseButton? ButtonUp { get; init; }

		[JsonPropertyName("Scroll")]
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public JsonCoords? Scroll { get; init; }

		[JsonPropertyName("Move")]
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public JsonCoords? Move { get; init; }

		public ActionEvent.MouseActionEvent ToMouseActionEvent() =>
			new()
			{
				ButtonDown = ButtonDown,
				ButtonUp = ButtonUp,
				Scroll = Scroll is not null ? (Scroll.X, Scroll.Y) : null,
				Move = Move is not null ? (Move.X, Move.Y) : null,
			};

		public static JsonMouseActionEvent From(ActionEvent.MouseActionEvent e) =>
			new()
			{
				ButtonDown = e.ButtonDown,
				ButtonUp = e.ButtonUp,
				Scroll = e.Scroll is not null ? new() { X = e.Scroll.Value.X, Y = e.Scroll.Value.Y } : null,
				Move = e.Move is not null ? new() { X = e.Move.Value.X, Y = e.Move.Value.Y } : null,
			};

		public sealed class JsonCoords
		{
			public required int X { get; init; }
			public required int Y { get; init; }
		}
	}

	public sealed class JsonLayerActionEvent
	{
		[JsonPropertyName("Clear")]
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public LayerTag? Clear { get; init; }

		[JsonPropertyName("Set")]
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public LayerTag? Set { get; init; }

		public ActionEvent.LayerActionEvent ToLayerActionEvent() => new() { Clear = Clear, Set = Set };

		public static JsonLayerActionEvent From(ActionEvent.LayerActionEvent e) =>
			new() { Clear = e.Clear, Set = e.Set };
	}
}
