using Cardboard.Update.Api;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Services;

file class ClearMetadataCacheService(IMetadataCache metadataCache) : IInitializable
{
	public Task Initialize()
	{
		// do nothing
		return Task.CompletedTask;
	}

	public Task Reinitialize()
	{
		metadataCache.ClearCache();
		return Task.CompletedTask;
	}
}

partial class Services
{
	public static IServiceCollection AddClearMetadataCache(this IServiceCollection services) =>
		services.AddSingleton<ClearMetadataCacheService>();
}
