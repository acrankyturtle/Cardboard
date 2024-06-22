using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Serial;

public static partial class Services
{
	public static IServiceCollection AddSystemSerialPort(this IServiceCollection services) =>
		services.AddSystemSerialPortProvider().AddSerialDeviceProvider().AddSerialDeviceConfiguration();
}
