using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Device;

public static partial class Services
{
	public static IServiceCollection AddCardboardDeviceManager(this IServiceCollection services) =>
		services.AddDeviceManager();

	public static IServiceCollection AddDeviceProvider<TDeviceProvider>(this IServiceCollection services)
		where TDeviceProvider : class, IDeviceProvider =>
		services.AddSingleton<IDeviceProvider, TDeviceProvider>();
}
