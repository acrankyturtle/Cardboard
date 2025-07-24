using Cardboard.Repositories;

namespace Cardboard.Events;

public interface IInputEventService
{
	IObservable<InputEvent> OnInput { get; }
}

public readonly record struct InputEvent(InputDeviceInfo Device, InputKey Key, InputKeyState State);

public record InputDeviceInfo
{
	public required string Vid { get; init; }
	public required string Pid { get; init; }
	public required string Serial { get; init; }
	public required string Description { get; init; }
}

[Flags]
public enum InputKeyState
{
	Press = 1,
	Release = 2,
	PressAndRelease = Press | Release,
}
