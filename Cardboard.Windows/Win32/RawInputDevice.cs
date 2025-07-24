using System.Runtime.InteropServices;

namespace Cardboard.Windows;

[StructLayout(LayoutKind.Sequential)]
public struct RawInputDevice
{
	public HidUsagePage UsagePage;
	public HidUsage Usage;
	public RawInputDeviceFlags Flags;
	public IntPtr Target;

	public override string ToString() => $"{UsagePage}/{Usage}, flags: {Flags}, target: {Target}";
}
