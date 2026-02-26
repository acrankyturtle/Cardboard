using System.Text.Json.Serialization;
using StronglyTypedIds;

namespace Cardboard.Device;

public sealed record DeviceProfile : IReadable<DeviceProfile>, IWriteable
{
	private const uint Version = 1;

	public required string Name { get; init; }
	public required IReadOnlyCollection<DeviceKey> Keys { get; init; }
	public required IReadOnlyList<DeviceVirtualKey> VirtualKeys { get; init; }
	public required IReadOnlyList<Macro> Macros { get; init; }

	public static DeviceProfile ReadFrom(BinaryReader reader)
	{
		var version = reader.ReadUInt32();
		if (version != Version)
			throw new InvalidDataException($"Unsupported {nameof(DeviceProfile)} version: {version}");

		var name = reader.ReadStringU8();
		var keys = reader.ReadCollectionU8<DeviceKey>();
		var virtualKeys = reader.ReadCollectionU8<DeviceVirtualKey>();
		var macros = reader.ReadCollectionU16<Macro>();

		return new()
		{
			Name = name,
			Keys = keys,
			VirtualKeys = virtualKeys,
			Macros = macros,
		};
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.Write(Version);
		writer.WriteStringU8(Name);
		writer.WriteCollectionU8(Keys);
		writer.WriteCollectionU8(VirtualKeys);
		writer.WriteCollectionU16(Macros);
	}
}

public sealed class DeviceKey : IReadable<DeviceKey>, IWriteable
{
	public required DeviceKeyId Id { get; init; }
	public required DeviceLayers Layers { get; init; }

	public static DeviceKey ReadFrom(BinaryReader reader)
	{
		var id = DeviceKeyId.ReadFrom(reader);
		var layers = DeviceLayers.ReadFrom(reader);

		return new() { Id = id, Layers = layers };
	}

	public void WriteTo(BinaryWriter writer)
	{
		Id.WriteTo(writer);
		Layers.WriteTo(writer);
	}
}

public sealed class DeviceVirtualKey : IReadable<DeviceVirtualKey>, IWriteable
{
	public required DeviceLayers Layers { get; init; }

	public static DeviceVirtualKey ReadFrom(BinaryReader reader)
	{
		var layers = DeviceLayers.ReadFrom(reader);

		return new() { Layers = layers };
	}

	public void WriteTo(BinaryWriter writer)
	{
		Layers.WriteTo(writer);
	}
}

public sealed class DeviceLayers : IReadable<DeviceLayers>, IWriteable
{
	public IReadOnlyCollection<TaggedDeviceKeyLayer> Layers { get; init; } = [];
	public required DeviceKeyLayer DefaultLayer { get; init; }

	public static DeviceLayers ReadFrom(BinaryReader reader)
	{
		var layers = reader.ReadCollectionU8<TaggedDeviceKeyLayer>();
		var defaultLayer = DeviceKeyLayer.ReadFrom(reader);

		return new() { Layers = layers, DefaultLayer = defaultLayer };
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.WriteCollectionU8(Layers);
		DefaultLayer.WriteTo(writer);
	}
}

public sealed class TaggedDeviceKeyLayer : IReadable<TaggedDeviceKeyLayer>, IWriteable
{
	public IReadOnlyCollection<LayerTag> Tags { get; init; } = [];
	public required TagMatchType MatchType { get; init; }
	public required DeviceKeyLayer Layer { get; init; }

	public static TaggedDeviceKeyLayer ReadFrom(BinaryReader reader)
	{
		var tags = reader.ReadCollectionU8<LayerTag>();
		var matchType = (TagMatchType)reader.ReadByte();
		var layer = DeviceKeyLayer.ReadFrom(reader);

		return new()
		{
			Tags = tags,
			MatchType = matchType,
			Layer = layer,
		};
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.WriteCollectionU8(Tags);
		writer.Write((byte)MatchType);
		Layer.WriteTo(writer);
	}
}

public sealed class DeviceKeyLayer : IReadable<DeviceKeyLayer>, IWriteable
{
	public required LayerId Id { get; init; }
	public required IReadOnlyCollection<MacroIndex> Macros { get; init; }

	public static DeviceKeyLayer ReadFrom(BinaryReader reader)
	{
		var id = LayerId.ReadFrom(reader);
		var macros = reader.ReadCollectionU8<MacroIndex>();

		return new() { Id = id, Macros = macros };
	}

	public void WriteTo(BinaryWriter writer)
	{
		Id.WriteTo(writer);
		writer.WriteCollectionU8(Macros);
	}
}

public enum TagMatchType
{
	Any,
	All,
}

public sealed class Macro : IReadable<Macro>, IWriteable
{
	public required MacroId Id { get; init; }
	public required string Name { get; init; }
	public MacroType Type { get; init; } = MacroType.Momentary;
	public Channel? PlayChannel { get; init; }
	public required IReadOnlyCollection<Channel> CutChannels { get; init; }
	public required Sequence StartSequence { get; init; }
	public required Sequence LoopSequence { get; init; }
	public required Sequence EndSequence { get; init; }

	public static Macro ReadFrom(BinaryReader reader)
	{
		var id = MacroId.ReadFrom(reader);
		var name = reader.ReadStringU8();
		var type = (MacroType)reader.ReadByte();
		var playChannel = reader.ReadOptionValue(Channel.ReadFrom);
		var cutChannels = reader.ReadCollectionU8<Channel>();
		var startSequence = Sequence.ReadFrom(reader);
		var loopSequence = Sequence.ReadFrom(reader);
		var endSequence = Sequence.ReadFrom(reader);

		return new()
		{
			Id = id,
			Name = name,
			Type = type,
			PlayChannel = playChannel,
			CutChannels = cutChannels,
			StartSequence = startSequence,
			LoopSequence = loopSequence,
			EndSequence = endSequence,
		};
	}

	public void WriteTo(BinaryWriter writer)
	{
		Id.WriteTo(writer);
		writer.WriteStringU8(Name);
		writer.Write((byte)Type);
		writer.WriteOption(PlayChannel);
		writer.WriteCollectionU8(CutChannels);
		StartSequence.WriteTo(writer);
		LoopSequence.WriteTo(writer);
		EndSequence.WriteTo(writer);
	}
}

public enum MacroType
{
	Momentary = 0,
	Toggle = 1,
}

public sealed class Sequence : IReadable<Sequence>, IWriteable
{
	public required IReadOnlyCollection<Action> Actions { get; init; }

	public static Sequence ReadFrom(BinaryReader reader)
	{
		var actions = reader.ReadCollectionU8<Action>();
		return new() { Actions = actions };
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.WriteCollectionU8(Actions);
	}
}

public sealed class Action : IReadable<Action>, IWriteable
{
	public ushort PredelayMs { get; init; }
	public required ActionEvent ActionEvent { get; init; }

	public static Action ReadFrom(BinaryReader reader)
	{
		var predelayMs = reader.ReadUInt16();
		var actionEvent = ActionEvent.ReadFrom(reader);

		return new() { PredelayMs = predelayMs, ActionEvent = actionEvent };
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.Write(PredelayMs);
		ActionEvent.WriteTo(writer);
	}
}

public sealed class ActionEvent : IReadable<ActionEvent>, IWriteable
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

	public static ActionEvent ReadFrom(BinaryReader reader)
	{
		var discriminator = reader.ReadByte();
		return discriminator switch
		{
			0 => new(),
			1 => new() { Keyboard = KeyboardActionEvent.ReadFrom(reader) },
			2 => new() { Mouse = MouseActionEvent.ReadFrom(reader) },
			3 => new() { ConsumerControl = (ConsumerControlEvent)reader.ReadByte() },
			4 => new() { Layer = LayerActionEvent.ReadFrom(reader) },
			5 => new() { Debug = DebugActionEvent.ReadFrom(reader) },
			_ => throw new InvalidDataException($"Unknown ActionEvent discriminator: {discriminator}"),
		};
	}

	public void WriteTo(BinaryWriter writer)
	{
		switch (Keyboard, Mouse, ConsumerControl, Layer, Debug)
		{
			case (null, null, null, null, null):
				writer.Write((byte)0);
				break;
			case ({ } keyboard, null, null, null, null):
				writer.Write((byte)1);
				keyboard.WriteTo(writer);
				break;
			case (null, { } mouse, null, null, null):
				writer.Write((byte)2);
				mouse.WriteTo(writer);
				break;
			case (null, null, { } consumerControl, null, null):
				writer.Write((byte)3);
				writer.Write((byte)consumerControl);
				break;
			case (null, null, null, { } layer, null):
				writer.Write((byte)4);
				layer.WriteTo(writer);
				break;
			case (null, null, null, null, { } debug):
				writer.Write((byte)5);
				debug.WriteTo(writer);
				break;
			default:
				throw new InvalidOperationException(
					$"{nameof(ActionEvent)} must have exactly one non-null property"
				);
		}
	}

	public sealed class KeyboardActionEvent : IReadable<KeyboardActionEvent>, IWriteable
	{
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public KeyboardKey? KeyDown { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public KeyboardKey? KeyUp { get; init; }

		public static KeyboardActionEvent ReadFrom(BinaryReader reader)
		{
			var isKeyDown = reader.ReadBoolean();
			var key = (KeyboardKey)reader.ReadByte();
			return isKeyDown ? new() { KeyDown = key } : new() { KeyUp = key };
		}

		public void WriteTo(BinaryWriter writer)
		{
			switch (KeyDown, KeyUp)
			{
				case ({ } keyDown, null):
					writer.Write(true);
					writer.Write((byte)keyDown);
					break;
				case (null, { } keyUp):
					writer.Write(false);
					writer.Write((byte)keyUp);
					break;
				default:
					throw new InvalidOperationException(
						$"{nameof(KeyboardActionEvent)} must be either {nameof(KeyDown)} or {nameof(KeyUp)}"
					);
			}
		}
	}

	public sealed class MouseActionEvent : IReadable<MouseActionEvent>, IWriteable
	{
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public MouseButton? ButtonDown { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public MouseButton? ButtonUp { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public (int X, int Y)? Scroll { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public (int X, int Y)? Move { get; init; }

		public static MouseActionEvent ReadFrom(BinaryReader reader)
		{
			var discriminator = reader.ReadByte();
			return discriminator switch
			{
				0 => new() { ButtonDown = (MouseButton)reader.ReadByte() },
				1 => new() { ButtonUp = (MouseButton)reader.ReadByte() },
				2 => new() { Scroll = (reader.ReadInt32(), reader.ReadInt32()) },
				3 => new() { Move = (reader.ReadInt32(), reader.ReadInt32()) },
				_ => throw new InvalidDataException(
					$"Unknown MouseActionEvent discriminator: {discriminator}"
				),
			};
		}

		public void WriteTo(BinaryWriter writer)
		{
			switch (ButtonDown, ButtonUp, Scroll, Move)
			{
				case ({ } buttonDown, null, null, null):
					writer.Write((byte)0);
					writer.Write((byte)buttonDown);
					break;
				case (null, { } buttonUp, null, null):
					writer.Write((byte)1);
					writer.Write((byte)buttonUp);
					break;
				case (null, null, { } scroll, null):
					writer.Write((byte)2);
					writer.Write(scroll.X);
					writer.Write(scroll.Y);
					break;
				case (null, null, null, { } move):
					writer.Write((byte)3);
					writer.Write(move.X);
					writer.Write(move.Y);
					break;
				default:
					throw new InvalidOperationException(
						$"{nameof(MouseActionEvent)} must be either {nameof(ButtonDown)}, {nameof(ButtonUp)}, {nameof(Scroll)}, or {nameof(Move)}"
					);
			}
		}
	}

	public sealed class LayerActionEvent : IReadable<LayerActionEvent>, IWriteable
	{
		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public LayerTag? Clear { get; init; }

		[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
		public LayerTag? Set { get; init; }

		public static LayerActionEvent ReadFrom(BinaryReader reader)
		{
			var discriminator = reader.ReadByte();
			return discriminator switch
			{
				0 => new() { Clear = LayerTag.ReadFrom(reader) },
				1 => new() { Set = LayerTag.ReadFrom(reader) },
				_ => throw new InvalidDataException(
					$"Unknown LayerActionEvent discriminator: {discriminator}"
				),
			};
		}

		public void WriteTo(BinaryWriter writer)
		{
			switch (Clear, Set)
			{
				case ({ } clear, null):
					writer.Write((byte)0);
					clear.WriteTo(writer);
					break;
				case (null, { } set):
					writer.Write((byte)1);
					set.WriteTo(writer);
					break;
				default:
					throw new InvalidOperationException(
						$"{nameof(LayerActionEvent)} must be either {nameof(Clear)} or {nameof(Set)}"
					);
			}
		}
	}

	public sealed class DebugActionEvent : IReadable<DebugActionEvent>, IWriteable
	{
		public required string Log { get; init; }

		public static DebugActionEvent ReadFrom(BinaryReader reader)
		{
			var log = reader.ReadStringU8();
			return new() { Log = log };
		}

		public void WriteTo(BinaryWriter writer)
		{
			writer.WriteStringU8(Log);
		}
	}
}

[StronglyTypedId]
public readonly partial struct DeviceKeyId : IReadable<DeviceKeyId>, IWriteable
{
	public static DeviceKeyId ReadFrom(BinaryReader reader)
	{
		var guid = reader.ReadGuid();
		return new(guid);
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.WriteGuid(Value);
	}
}

[StronglyTypedId]
public readonly partial struct LayerId : IReadable<LayerId>, IWriteable
{
	public static LayerId ReadFrom(BinaryReader reader)
	{
		var guid = reader.ReadGuid();
		return new(guid);
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.WriteGuid(Value);
	}
}

[StronglyTypedId(Template.String)]
public readonly partial struct LayerTag : IReadable<LayerTag>, IWriteable
{
	public static LayerTag ReadFrom(BinaryReader reader)
	{
		var tag = reader.ReadStringU8();
		return new(tag);
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.WriteStringU8(Value);
	}
}

[StronglyTypedId(Template.Int)] // WISH: ushort
public readonly partial struct MacroIndex : IReadable<MacroIndex>, IWriteable
{
	public static MacroIndex ReadFrom(BinaryReader reader)
	{
		var index = reader.ReadUInt16();
		return new(index);
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.Write((ushort)Value);
	}
}

[StronglyTypedId]
public readonly partial struct MacroId : IReadable<MacroId>, IWriteable
{
	public static MacroId ReadFrom(BinaryReader reader)
	{
		var id = reader.ReadGuid();
		return new(id);
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.WriteGuid(Value);
	}
}

[StronglyTypedId(Template.Long)] // WISH: uint
public readonly partial struct Channel : IReadable<Channel>, IWriteable
{
	public static Channel ReadFrom(BinaryReader reader)
	{
		var id = reader.ReadUInt32();
		return new(id);
	}

	public void WriteTo(BinaryWriter writer)
	{
		writer.Write((uint)Value);
	}
}

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
