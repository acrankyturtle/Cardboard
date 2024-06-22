using Microsoft.Extensions.DependencyInjection;

namespace Catboard.Device;

public static partial class Services
{
	public static IServiceCollection AddCatboardDeviceManager(this IServiceCollection services) =>
		services.AddDeviceManager();
}
