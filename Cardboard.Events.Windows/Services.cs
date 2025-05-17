using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Events.Windows;

public static partial class Services
{
	public static IServiceCollection AddCardboardWindowsEvents(this IServiceCollection services) =>
		services.AddApplicationEvents(); //.AddDeviceEvents();
}
