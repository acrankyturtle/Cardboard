using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Cardboard.Services;

public interface IInitializable
{
	Task Initialize();

	public Task Reinitialize() => Task.CompletedTask;
}

public interface IReinitializer
{
	/// <remarks>Take care when calling this. With event-driven systems, this will trigger cascading refreshes in some systems.</remarks>
	Task Reinitialize();
}

file class InitializationProvider(IServiceProvider serviceProvider, IServiceCollection serviceCollection)
{
	public IEnumerable<IInitializable> Initializations { get; } =
		GetInitializations(serviceProvider, serviceCollection);

	private static List<IInitializable> GetInitializations(
		IServiceProvider serviceProvider,
		IServiceCollection serviceCollection
	) =>
		serviceCollection
			.Where(d => d.ImplementationType?.IsAssignableTo(typeof(IInitializable)) ?? false)
			.SelectMany(d => serviceProvider.GetServices(d.ServiceType).OfType<IInitializable>())
			.ToList();
}

file class InitializerHostedService(InitializationProvider provider) : IHostedLifecycleService
{
	public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;

	public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

	public Task StartingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

	public async Task StartedAsync(CancellationToken cancellationToken)
	{
		foreach (var i in provider.Initializations)
		{
			await i.Initialize();
		}
	}

	public Task StoppingAsync(CancellationToken cancellationToken) => Task.CompletedTask;

	public Task StoppedAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

file class Reinitializer(InitializationProvider provider) : IReinitializer
{
	public async Task Reinitialize()
	{
		foreach (var i in provider.Initializations)
		{
			await i.Reinitialize();
		}
	}
}

partial class Services
{
	public static IServiceCollection AddInitialization(this IServiceCollection services) =>
		services
			.AddSingleton<InitializationProvider>(sp => new(sp, services))
			.AddSingleton<IReinitializer, Reinitializer>()
			.AddHostedService<InitializerHostedService>();

	public static async Task Initialize(this IServiceProvider serviceProvider)
	{
		var initializationProvider = serviceProvider.GetRequiredService<InitializationProvider>();

		foreach (var i in initializationProvider.Initializations)
		{
			await i.Initialize();
		}
	}

	public static async Task Reinitialize(this IServiceProvider serviceProvider)
	{
		var reinitializer = serviceProvider.GetRequiredService<IReinitializer>();
		await reinitializer.Reinitialize();
	}
}
