using Cardboard.Events;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Windows;

public static partial class Services
{
	public static IServiceCollection AddCardboardWindowsEvents(this IServiceCollection services) =>
		services
			.AddSingleton<IApplicationEventService, ApplicationEventService>()
			.AddSingleton<InputEventService>()
			.AddSingleton<IInputEventService>(sp => sp.GetRequiredService<InputEventService>())
			.AddSingleton<IInputDeviceListService>(sp => sp.GetRequiredService<InputEventService>());
}
