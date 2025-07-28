using Cardboard.Events;
using Cardboard.Services;
using Cardboard.Utilities;

namespace Cardboard.Windows;

internal sealed class ApplicationEventService : IApplicationEventService, IInitializable, IDisposable
{
	private readonly WindowHook _windowHook;

	private readonly AsyncDispatchSubject<ApplicationChangedEvent> _applicationChangedSubject = new();
	private readonly LazyObservable<ApplicationChangedEvent> _lazy;

	public IObservable<ApplicationChangedEvent> OnApplicationChanged { get; }

	public ApplicationEventService(IWindowsService windowsService)
	{
		// hook needs to be enabled on the form thread
		_windowHook = windowsService.Invoke(_ =>
		{
			var windowHook = new WindowHook();
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
		var activeApp = WindowHook.GetCurrent();
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
