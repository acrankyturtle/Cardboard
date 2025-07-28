using System.Runtime.InteropServices;

namespace Cardboard.Windows;

[StructLayout(LayoutKind.Explicit)]
internal struct RawMouse
{
	[FieldOffset(0)]
	public ushort Flags;

	[FieldOffset(4)]
	public uint Buttons;

	[FieldOffset(4)]
	public RawMouseButtons ButtonFlags;

	[FieldOffset(6)]
	public short ButtonData;

	[FieldOffset(8)]
	public uint RawButtons;

	[FieldOffset(12)]
	public int LastX;

	[FieldOffset(16)]
	public int LastY;

	[FieldOffset(20)]
	public uint ExtraInformation;
}
