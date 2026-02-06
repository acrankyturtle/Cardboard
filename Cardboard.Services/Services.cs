using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Services;

public static partial class Services
{
	public static IServiceCollection AddCardboardServices(this IServiceCollection services) =>
		services.AddAssociationEvents().AddClearMetadataCache().AddTagSwitcher().AddVirtualKeyDispatcher();
}
