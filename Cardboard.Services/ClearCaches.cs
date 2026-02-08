using Cardboard.Update.Api;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Services;

file class ClearMemoryCachesService(IEnumerable<IClearMemoryCache> caches) : IInitializable
{
	public Task Initialize()
	{
		// do nothing
		return Task.CompletedTask;
	}

	public Task Reinitialize()
	{
		foreach (var cache in caches)
		{
			cache.ClearMemoryCache();
		}

		return Task.CompletedTask;
	}
}

partial class Services
{
	private static IServiceCollection AddClearCaches(this IServiceCollection services) =>
		services.AddSingleton<ClearMemoryCachesService>();
}
