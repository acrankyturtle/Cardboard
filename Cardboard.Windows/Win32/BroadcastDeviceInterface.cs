using System.Runtime.InteropServices;

namespace Cardboard.Windows;

[StructLayout(LayoutKind.Sequential)]
public struct BroadcastDeviceInterface
{
	public int DbccSize;
	public BroadcastDeviceType BroadcastDeviceType;
	public int DbccReserved;
	public Guid DbccClassguid;
	public char DbccName;
}
