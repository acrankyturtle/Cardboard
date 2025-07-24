using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Cardboard.Services;

public interface IInitialize
{
	Task Initialize();

	public Task Reinitialize() => Task.CompletedTask;
}

public interface IReinitializer
{
	Task Reinitialize();
}

file class InitializationProvider(IServiceProvider serviceProvider, IServiceCollection serviceCollection)
{
	public IEnumerable<IInitialize> Initializations { get; } =
		GetInitializations(serviceProvider, serviceCollection);

	private static IReadOnlyCollection<IInitialize> GetInitializations(
		IServiceProvider serviceProvider,
		IServiceCollection serviceCollection
	) =>
		serviceCollection
			.Where(d => d.ImplementationType?.IsAssignableTo(typeof(IInitialize)) ?? false)
			.SelectMany(d => serviceProvider.GetServices(d.ServiceType).OfType<IInitialize>())
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
	private static IServiceCollection AddInitialization(this IServiceCollection services) =>
		services
			.AddSingleton<InitializationProvider>(sp => new(sp, services))
			.AddSingleton<IReinitializer, Reinitializer>()
			.AddHostedService<InitializerHostedService>();
}
