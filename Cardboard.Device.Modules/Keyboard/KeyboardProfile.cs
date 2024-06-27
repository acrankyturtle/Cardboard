using StronglyTypedIds;

namespace Cardboard.Device.Modules.Keyboard;

public interface IKeyboardService
{
	Task SetProfile(KeyboardProfile profile);
}

public record KeyboardProfile(IReadOnlyDictionary<KeyboardKeyId, KeyboardKey> Keys);

/// <param name="Layers">That active layer is the last layer with an enabled tag. If no layers are enabled, the first layer will be selected as the active layer if it exists.</param>
public record KeyboardKey(IReadOnlyList<KeyboardKeyLayer> Layers);

/// <param name="Tags">Layer is enabled if any of these tags are enabled.</param>
public record KeyboardKeyLayer(IReadOnlyCollection<KeyboardLayerTag> Tags, KeyBinding Binding);

public record KeyBinding(IReadOnlyCollection<Macro> Macros);

/// <param name="StartSequence">Sequence to run when the macro begins.</param>
/// <param name="LoopSequence">Sequence to run immediately after the start sequence completes.</param>
/// <param name="EndSequence">Sequence to run after a loop has completed and the macro is ending. A macro can end from either the user releasing the key, its channel being cut, or the layer changing and causing the macro to no longer be active on the key.</param>
public record Macro(
	string Name,
	MacroType MacroType,
	MacroChannel Channel,
	MacroSequence StartSequence,
	MacroSequence LoopSequence,
	MacroSequence EndSequence
);

public record MacroChannel(
	KeyboardMacroChannel PlayOnChannel,
	IReadOnlyCollection<KeyboardMacroChannel> CutChannels
);

public record MacroSequence(IReadOnlyCollection<MacroAction> Actions);

/// <param name="DelayBefore">In milliseconds.</param>
public record MacroAction(KeyMacroAction? KeyAction, LayerMacroAction? LayerAction, int DelayBefore);

public record KeyMacroAction(KeyCode KeyCode, KeyActionType Type);

public record LayerMacroAction(
	IReadOnlyCollection<KeyboardLayerTag> Enable,
	IReadOnlyCollection<KeyboardLayerTag> Disable
);

[StronglyTypedId]
public readonly partial struct KeyboardKeyId;

[StronglyTypedId(Template.String)]
public readonly partial struct KeyboardLayerTag;

[StronglyTypedId(Template.Int)]
public readonly partial struct KeyboardMacroChannel;

public enum MacroType
{
	Momentary,
	Toggle,
}

public enum KeyActionType
{
	Down,
	Up,
	Full,
}

public enum KeyCode
{
	NONE = 0,
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

	// mouse codes
	MOUSE_LEFT = 0x01 | (1 << 14),
	MOUSE_RIGHT = 0x02 | (1 << 14),
	MOUSE_MIDDLE = 0x04 | (1 << 14),
	MOUSE_BACKWARD = 0x08 | (1 << 14),
	MOUSE_FORWARD = 0x10 | (1 << 14),

	MOUSE_WHEEL_UP = 0x01 | (1 << 13),
	MOUSE_WHEEL_DOWN = 0x02 | (1 << 13),

	// consumer control codes
	RECORD = 0xB2 | (1 << 15),
	FAST_FORWARD = 0xB3 | (1 << 15),
	REWIND = 0xB4 | (1 << 15),
	SCAN_NEXT_TRACK = 0xB5 | (1 << 15),
	SCAN_PREVIOUS_TRACK = 0xB6 | (1 << 15),
	STOP = 0xB7 | (1 << 15),
	EJECT = 0xB8 | (1 << 15),
	PLAY_PAUSE = 0xCD | (1 << 15),
	MUTE = 0xE2 | (1 << 15),
	VOLUME_DECREMENT = 0xEA | (1 << 15),
	VOLUME_INCREMENT = 0xE9 | (1 << 15),
	BRIGHTNESS_DECREMENT = 0x70 | (1 << 15),
	BRIGHTNESS_INCREMENT = 0x6F | (1 << 15),
}
