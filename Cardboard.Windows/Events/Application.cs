using Cardboard.Events;
using Cardboard.Services;
using Cardboard.Utilities;
using Microsoft.Extensions.Logging;

namespace Cardboard.Windows;

internal sealed class ApplicationEventService : IApplicationEventService, IInitializable, IDisposable
{
	private readonly WindowHook _windowHook;

	private readonly AsyncDispatchSubject<ApplicationChangedEvent> _applicationChangedSubject = new();
	private readonly LazyObservable<ApplicationChangedEvent> _lazy;

	public IObservable<ApplicationChangedEvent> OnApplicationChanged { get; }

	public ApplicationEventService(IWindowsService windowsService, ILoggerFactory loggerFactory)
	{
		// hook needs to be created on the form thread
		_windowHook = windowsService.Invoke(_ =>
		{
			var logger = loggerFactory.CreateLogger<WindowHook>();
			var windowHook = new WindowHook(logger);
			windowHook.ActiveWindowChanged += appInfo =>
				_applicationChangedSubject.OnNext(new(appInfo.ExecutablePath));

			return windowHook;
		});

		_lazy = _applicationChangedSubject.Lazy(
			() => windowsService.Invoke(_ => _windowHook.Hook()),
			() => windowsService.Invoke(_ => _windowHook.Unhook())
		);

		OnApplicationChanged = _lazy;
	}

	public Task Initialize()
	{
		var activeApp = _windowHook.GetCurrent();
		if (activeApp is not null)
			_applicationChangedSubject.OnNext(new(activeApp.ExecutablePath));

		return Task.CompletedTask;
	}

	public async Task Reinitialize() => await Initialize();

	public void Dispose()
	{
		_windowHook.Dispose();
		_applicationChangedSubject.OnCompleted();
		_lazy.Dispose();
		_applicationChangedSubject.Dispose();
	}
}
