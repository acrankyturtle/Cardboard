using System.Runtime.InteropServices;

namespace Cardboard.Windows;

[StructLayout(LayoutKind.Explicit)]
public struct RawData
{
	[FieldOffset(0)]
	public RawMouse Mouse;

	[FieldOffset(0)]
	public RawKeyboard Keyboard;

	[FieldOffset(0)]
	public RawHID Hid;
}
