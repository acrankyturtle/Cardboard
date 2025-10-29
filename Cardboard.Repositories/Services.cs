using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Repositories;

public static partial class Services
{
	public static IServiceCollection AddRepositories(
		this IServiceCollection services,
		IConfigurationSection configuration
	)
	{
		services.Configure<ApplicationRepositoryConfiguration>(configuration);
		return services.AddDeviceRepository().AddApplicationRepository().AddSchemaRepository();
	}
}
