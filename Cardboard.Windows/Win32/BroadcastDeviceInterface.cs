using System.Runtime.InteropServices;

namespace Cardboard.Windows;

[StructLayout(LayoutKind.Sequential)]
internal struct BroadcastDeviceInterface
{
	public int DbccSize;
	public BroadcastDeviceType BroadcastDeviceType;
	public int DbccReserved;
	public Guid DbccClassguid;
	public char DbccName;
}
