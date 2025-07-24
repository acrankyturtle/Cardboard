using System.Reactive.Disposables;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cardboard.Events;

public static class DebugServices
{
	public static IDebugEventBuilder AddEventDebugger(this IServiceCollection services)
	{
		services.AddHostedService<EventDebugger>();
		return new Builder(services);
	}
}

public interface IDebugEventBuilder
{
	IDebugEventBuilder WithEvent<T>(string name, Func<IServiceProvider, IObservable<T>> getEvent);
}

file class Builder(IServiceCollection services) : IDebugEventBuilder
{
	public IDebugEventBuilder WithEvent<T>(string name, Func<IServiceProvider, IObservable<T>> getEvent)
	{
		services.AddSingleton<IDebugEvent>(sp =>
			ActivatorUtilities.CreateInstance<DebugEvent<T>>(sp, getEvent, name)
		);
		return this;
	}
}

internal interface IDebugEvent
{
	IDisposable Subscribe(ILogger logger);
}

file class DebugEvent<T>(
	IServiceProvider serviceProvider,
	Func<IServiceProvider, IObservable<T>> getEvent,
	string name
) : IDebugEvent
{
	IDisposable IDebugEvent.Subscribe(ILogger logger)
	{
		var observable = getEvent(serviceProvider);
		var subscription = observable.Subscribe(
			x => logger.LogDebug("Event: {Name}: {Event}", name, x),
			ex => logger.LogError(ex, "Event error for {Name}", name)
		);
		return subscription;
	}
}

internal class EventDebugger(IEnumerable<IDebugEvent> events, ILogger<EventDebugger> logger) : IHostedService
{
	private CompositeDisposable? _disposables;

	public Task StartAsync(CancellationToken cancellationToken)
	{
		var subscriptions = events.Select(x => x.Subscribe(logger)).ToList();
		_disposables = new(subscriptions);

		return Task.CompletedTask;
	}

	public Task StopAsync(CancellationToken cancellationToken)
	{
		_disposables?.Dispose();
		_disposables = null;

		return Task.CompletedTask;
	}
}
