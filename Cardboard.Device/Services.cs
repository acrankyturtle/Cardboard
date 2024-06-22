using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Device;

public static partial class Services
{
	public static IServiceCollection AddCardboardDeviceManager(this IServiceCollection services) =>
		services.AddDeviceManager();
}
