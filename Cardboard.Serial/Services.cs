using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Serial;

public static partial class Services
{
	public static IServiceCollection AddSystemSerialPort(
		this IServiceCollection services,
		IConfiguration configuration
	) =>
		services
			.AddSystemSerialPortProvider()
			// .AddFakeSerialPortProvider()
			.AddSerialDeviceProvider()
			.AddSerialDeviceConfiguration(configuration);
}
