using System.Runtime.InteropServices;

namespace Cardboard.Windows;

[StructLayout(LayoutKind.Sequential)]
internal struct RawInputDeviceList
{
	public IntPtr hDevice;
	public uint dwType;
}
