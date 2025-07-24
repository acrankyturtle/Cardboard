using System.Runtime.InteropServices;

namespace Cardboard.Windows;

[StructLayout(LayoutKind.Sequential)]
public struct RawInputDeviceList
{
	public IntPtr hDevice;
	public uint dwType;
}
