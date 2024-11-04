using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Services;

public interface IInitialize
{
	Task Initialize();
}

internal class InitializationService(IEnumerable<IInitialize> initializations)
{
	private bool _initialized;

	public async Task Initialize()
	{
		if (_initialized)
			throw new InvalidOperationException("Initialization has already been performed.");

		foreach (var initialization in initializations)
		{
			await initialization.Initialize();
		}

		_initialized = true;
	}
}

public static partial class Services
{
	public static IServiceCollection AddInitialization(this IServiceCollection services) =>
		services.AddSingleton<InitializationService>();

	public static Task Initialize(this IServiceProvider serviceProvider) =>
		serviceProvider.GetRequiredService<InitializationService>().Initialize();
}
