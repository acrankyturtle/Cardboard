using Cranky;
using StronglyTypedIds;

namespace Cardboard.Device.Modules.Keyboard;

public class SetKeyboardProfileCommand(KeyboardProfile profile)
	: ICommandWithResponse<SetKeyboardProfileCommandResponse>
{
	public CommandId Id { get; } = CommandId.Parse("45963fd8-73e2-50a0-ba69-69c3333dd8af");
	public ReadOnlyMemory<byte> Data => Serialize(profile);

	public Result<SetKeyboardProfileCommandResponse> GetResult(ReadOnlySpan<byte> data)
	{
		return Result.Success(new SetKeyboardProfileCommandResponse { Success = data is [0xFF] });
	}

	private static ReadOnlyMemory<byte> Serialize(KeyboardProfile profile)
	{
		using var stream = new MemoryStream();
		stream.Write(stackalloc byte[] { 0, 0 });
		BinaryHelpers.WriteJson(profile, stream);
		var len = stream.Length - 2;
		var buffer = stream.GetBuffer().AsSpan();
		buffer[0] = (byte)len;
		buffer[1] = (byte)(len >> 8);
		return stream.ToArray();
	}
}

public class SetKeyboardProfileCommandResponse
{
	public required bool Success { get; init; }
}

public class FakeCommand : ICommandWithResponse<Unit>
{
	public CommandId Id => CommandId.Parse("fb46f5a3-41dc-42d1-88d7-5acb5bb7234e");
	public ReadOnlyMemory<byte> Data => default;

	public Result<Unit> GetResult(ReadOnlySpan<byte> data) => Unit.Value;
}

// public interface IKeyboardService
// {
// 	Task<Result<IReadOnlyCollection<DeviceKeyInfo>>> GetDeviceKeys(DeviceId deviceId);
// 	Task<Result<KeyboardProfile>> GetDeviceProfile(DeviceId deviceId);
// 	Task SetDeviceProfile(DeviceId deviceId, KeyboardProfile profile);
//
// 	Task SetExternalLayerTags(IReadOnlyCollection<KeyboardLayerTag> tags);
//
// 	Task SetVirtualKeyState(KeyboardKeyId keyId, VirtualKeyEvent events);
// }
//
// internal class KeyboardService(IDeviceManager deviceManager) : IKeyboardService
// {
// 	private static readonly CommandId _getDeviceKeysCommandId =
// 		new(Guid.Parse("E98E5984-05C6-47D0-A96E-FE0129376749"));
// 	private static readonly CommandId _getDeviceProfileCommandId =
// 		new(Guid.Parse("FB6969F0-C63C-4D02-939F-3C767D5B6577"));
// 	private static readonly CommandId _setDeviceProfileCommandId =
// 		new(Guid.Parse("C1E811DB-C502-4118-A70B-21C59C803466"));
// 	private static readonly CommandId _setExternalLayerTagsCommandId =
// 		new(Guid.Parse("A1FFA53C-721E-4096-BE00-9941AD08CAA6"));
// 	private static readonly CommandId _setVirtualKeyStateCommandId =
// 		new(Guid.Parse("14989349-88B9-4EE6-A08B-5753973691D5"));
//
// 	public async Task<Result<IReadOnlyCollection<DeviceKeyInfo>>> GetDeviceKeys(DeviceId deviceId) =>
// 		(
// 			await deviceManager.SendWithResponse(
// 				deviceId,
// 				new(_getDeviceKeysCommandId, ReadOnlyMemory<byte>.Empty),
// 				b =>
// 				{
// 					var span = b.Span;
// 					return BinaryHelpers.ReadJson<GetDeviceKeysResponse>(ref span);
// 				}
// 			)
// 		).Select(x => x.Keys);
//
// 	public async Task<Result<KeyboardProfile>> GetDeviceProfile(DeviceId deviceId) =>
// 		(
// 			await deviceManager.SendWithResponse(
// 				deviceId,
// 				new(_getDeviceProfileCommandId, ReadOnlyMemory<byte>.Empty),
// 				b =>
// 				{
// 					var span = b.Span;
// 					return BinaryHelpers.ReadJson<GetDeviceProfileResponse>(ref span);
// 				}
// 			)
// 		).Select(x => x.Profile);
//
// 	public async Task SetDeviceProfile(DeviceId deviceId, KeyboardProfile profile)
// 	{
// 		using var stream = new MemoryStream();
// 		BinaryHelpers.WriteJson(profile, stream);
// 		var memory = stream.AsMemory();
//
// 		var message = new DeviceCommand(_setDeviceProfileCommandId, memory);
//
// 		await deviceManager.Send(deviceId, message);
// 	}
//
// 	public async Task SetExternalLayerTags(IReadOnlyCollection<KeyboardLayerTag> tags)
// 	{
// 		using var stream = new MemoryStream();
// 		await using var writer = stream.CreateDeviceWriter();
//
// 		writer.Write(tags.Count);
// 		foreach (var tag in tags)
// 		{
// 			writer.Write(tag.Value.Length);
// 			writer.Write(tag.Value.AsSpan());
// 		}
// 		var memory = stream.AsMemory();
//
// 		var message = new DeviceCommand(_setExternalLayerTagsCommandId, memory);
//
// 		await deviceManager.Broadcast(message);
// 	}
//
// 	public async Task SetVirtualKeyState(KeyboardKeyId keyId, VirtualKeyEvent events)
// 	{
// 		using var stream = new MemoryStream();
// 		await using var writer = stream.CreateDeviceWriter();
//
// 		writer.WriteGuid(keyId.Value);
// 		writer.Write((byte)events);
//
// 		var memory = stream.AsMemory();
// 		var message = new DeviceCommand(_setVirtualKeyStateCommandId, memory);
//
// 		await deviceManager.Broadcast(message);
// 	}
//
// 	private class GetDeviceProfileResponse
// 	{
// 		public required KeyboardProfile Profile { get; init; }
// 	}
// }

// public static class Services
// {
// 	public static IServiceCollection AddKeyboard(this IServiceCollection services) =>
// 		services.AddSingleton<IKeyboardService, KeyboardService>();
// }

[Flags]
public enum VirtualKeyEvent : byte
{
	None = 0,
	Down = 1,
	Up = 2,
	Press = 3,
}

public class GetDeviceKeysResponse
{
	public required IReadOnlyCollection<DeviceKeyInfo> Keys { get; init; }
}

public class DeviceKeyInfo
{
	public required KeyboardKeyId Id { get; init; }
}

public class KeyboardProfile
{
	public required IReadOnlyCollection<DeviceKey> Keys { get; init; }
}

public class DeviceKey
{
	public required KeyboardKeyId Id { get; init; }
	public required IReadOnlyCollection<TaggedDeviceKeyLayer> Layers { get; init; }
	public required DeviceKeyLayer DefaultLayer { get; init; }
}

public class TaggedDeviceKeyLayer
{
	public required DeviceKeyLayer Layer { get; init; }
	public required IReadOnlyCollection<KeyboardLayerTag> Tags { get; init; }
	public required TagMatchType MatchType { get; init; }
}

public enum TagMatchType
{
	All,
	Any,
}

public class DeviceKeyLayer
{
	public required KeyboardLayerId Id { get; init; }
	public required IReadOnlyCollection<Macro> Macros { get; init; }
}

/// <param name="Tags">Layer is enabled if any of these tags are enabled.</param>
public record KeyboardLayer(
	IReadOnlyCollection<KeyboardLayerTag> Tags,
	IReadOnlyDictionary<KeyboardKeyId, KeyBinding> Bindings
);

public record KeyBinding(IReadOnlyCollection<Macro> Macros);

public class Macro
{
	public required MacroId Id { get; init; }
	public required string Name { get; init; }

	// public required MacroType MacroType { get; init; }
	public required MacroChannel? PlayChannel { get; init; }
	public required IReadOnlyCollection<MacroChannel> CutChannels { get; init; }

	/// <summary>Sequence to run when the macro begins.</summary>
	public required MacroSequence StartSequence { get; init; }

	/// <summary>Sequence to run and loop immediately after the start sequence completes. If the macro is cut during the start sequence, this sequence could be skipped entirely.</summary>
	public required MacroSequence LoopSequence { get; init; }

	/// <summary>Sequence to run after the macro is cut. A macro can be cut from either the user releasing the key, its channel being cut, or the layer changing and causing the macro to no longer be active on the key.</summary>
	public required MacroSequence EndSequence { get; init; }
}

public class MacroSequence
{
	public required IReadOnlyCollection<MacroAction> Actions { get; init; }
}

public record MacroChannel(
	KeyboardMacroChannel PlayOnChannel,
	IReadOnlyCollection<KeyboardMacroChannel> CutChannels
);

public class MacroAction
{
	/// <summary>In milliseconds.</summary>
	public required int Predelay { get; init; }

	public required MacroActionEvent ActionEvent { get; init; }
}

public class MacroActionEvent
{
	public KeyboardEvent? Keyboard { get; }
	public MouseEvent? Mouse { get; }
	public ConsumerControlEvent? ConsumerControl { get; }
	public LayerEvent? Layer { get; }
	public DebugLogEvent? DebugLog { get; }
}

public class KeyboardEvent
{
	public KeyCode? KeyDown { get; }
	public KeyCode? KeyUp { get; }
}

public class MouseEvent
{
	public MouseButton? ButtonDown { get; }
	public MouseButton? ButtonUp { get; }
	public MouseScroll? Scroll { get; }
	public MouseMove? Move { get; }
}

public class MouseScroll
{
	public required int X { get; init; }
	public required int Y { get; init; }
}

public class MouseMove
{
	public required int X { get; init; }
	public required int Y { get; init; }
}

public class LayerEvent
{
	public KeyboardLayerTag? Clear { get; }
	public KeyboardLayerTag? Set { get; }
}

public class DebugLogEvent
{
	public required string Message { get; init; }
}

[StronglyTypedId]
public readonly partial struct KeyboardKeyId;

[StronglyTypedId]
public readonly partial struct KeyboardLayerId;

[StronglyTypedId(Template.String)]
public readonly partial struct KeyboardLayerTag;

[StronglyTypedId]
public readonly partial struct MacroId;

[StronglyTypedId(Template.Int)]
public readonly partial struct KeyboardMacroChannel;

public enum MacroType
{
	Momentary,
	Toggle,
}

public enum KeyCode
{
	A,
	B,
	C,
	D,
	E,
	F,
	G,
	H,
	I,
	J,
	K,
	L,
	M,
	N,
	O,
	P,
	Q,
	R,
	S,
	T,
	U,
	V,
	W,
	X,
	Y,
	Z,
	ONE,
	TWO,
	THREE,
	FOUR,
	FIVE,
	SIX,
	SEVEN,
	EIGHT,
	NINE,
	ZERO,
	ENTER,
	ESCAPE,
	BACKSPACE,
	TAB,
	SPACEBAR,
	MINUS,
	EQUALS,
	LEFT_BRACKET,
	RIGHT_BRACKET,
	BACKSLASH,
	POUND,
	SEMICOLON,
	QUOTE,
	GRAVE_ACCENT,
	COMMA,
	PERIOD,
	FORWARD_SLASH,
	CAPS_LOCK,
	F1,
	F2,
	F3,
	F4,
	F5,
	F6,
	F7,
	F8,
	F9,
	F10,
	F11,
	F12,
	PRINT_SCREEN,
	SCROLL_LOCK,
	PAUSE,
	INSERT,
	HOME,
	PAGE_UP,
	DELETE,
	END,
	PAGE_DOWN,
	RIGHT_ARROW,
	LEFT_ARROW,
	DOWN_ARROW,
	UP_ARROW,
	KEYPAD_NUMLOCK,
	KEYPAD_FORWARD_SLASH,
	KEYPAD_ASTERISK,
	KEYPAD_MINUS,
	KEYPAD_PLUS,
	KEYPAD_ENTER,
	KEYPAD_ONE,
	KEYPAD_TWO,
	KEYPAD_THREE,
	KEYPAD_FOUR,
	KEYPAD_FIVE,
	KEYPAD_SIX,
	KEYPAD_SEVEN,
	KEYPAD_EIGHT,
	KEYPAD_NINE,
	KEYPAD_ZERO,
	KEYPAD_PERIOD,
	KEYPAD_BACKSLASH,
	APPLICATION,

	KEYPAD_EQUALS,
	F13,
	F14,
	F15,
	F16,
	F17,
	F18,
	F19,
	F20,
	F21,
	F22,
	F23,
	F24,

	MENU,

	LEFT_CONTROL,
	LEFT_SHIFT,
	LEFT_ALT,
	LEFT_GUI,
	RIGHT_CONTROL,
	RIGHT_SHIFT,
	RIGHT_ALT,
	RIGHT_GUI,
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
