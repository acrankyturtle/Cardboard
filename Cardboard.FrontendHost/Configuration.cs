using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.FrontendHost;

partial class Services
{
	public static IServiceCollection ConfigureFrontend(
		this IServiceCollection services,
		IConfigurationSection configuration
	) => services.Configure<FrontendConfiguration>(configuration);
}

public class FrontendConfiguration
{
	public required string ReactHostUrl { get; init; }
}
