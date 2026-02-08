using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Update.Api;

static partial class Services
{
	public static IServiceCollection ConfigureCacheTimings(
		this IServiceCollection services,
		IConfiguration configuration
	) => services.Configure<CacheTimings>(configuration);
}
