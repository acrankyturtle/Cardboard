namespace Cardboard.Device.Modules.Keyboard;

public interface IVirtualKeyService
{
	Task Send(KeyboardKeyId keyId, VirtualKeyState state);
}

public enum VirtualKeyState
{
	Down,
	Up,
	Press,
}
