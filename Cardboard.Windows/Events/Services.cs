using Cardboard.Events;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Windows;

public static partial class Services
{
	public static IServiceCollection AddCardboardWindowsEvents(this IServiceCollection services) =>
		services
			.AddSingleton<IApplicationEventService, ApplicationEventService>()
			//.AddSingleton<IDeviceEventService, DeviceEventService>()
			.AddSingleton<IInputEventService, InputEventService>();
}
