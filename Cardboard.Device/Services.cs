using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Device;

public static partial class Services
{
	public static IServiceCollection AddDeviceServices(this IServiceCollection services) =>
		services.AddDeviceService();
}
