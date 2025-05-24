using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Serial.Windows;

public static partial class Services
{
	public static IServiceCollection AddWindowsSerialPort(this IServiceCollection services) =>
		services.AddWindowsSerialDeviceFinder().AddWindowsSerialDeviceProvider();
}
