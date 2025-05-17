using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Repositories;

public static partial class Services
{
	public static IServiceCollection AddRepositories(this IServiceCollection services) =>
		services.AddDeviceRepository().AddTagRepository();
}
