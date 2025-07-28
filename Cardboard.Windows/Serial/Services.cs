using Cardboard.Device;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Windows;

partial class Services
{
	public static IServiceCollection AddWindowsSerialPort(this IServiceCollection services) =>
		services
			.AddSingleton<IWindowsSerialDeviceFinder, WindowsSerialDeviceFinder>()
			.AddSingleton<IDeviceProvider, WindowsSerialDeviceProvider>();
}
