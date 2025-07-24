using System.Reactive.Linq;
using System.Reactive.Subjects;
using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Windows;

public interface IWindowsService
{
	IntPtr Handle { get; }

	IObservable<Message> OnMessage { get; }

	T Invoke<T>(Func<Form, T> func);

	void Invoke(Action<Form> action) =>
		Invoke(form =>
		{
			action(form);
			return Unit.Value;
		});
}

file class WindowsService : IWindowsService, IDisposable
{
	private readonly HiddenWindow _window = new();
	private readonly Thread _windowThread;

	public IntPtr Handle { get; }

	public IObservable<Message> OnMessage => _window.OnMessage;

	public WindowsService()
	{
		_windowThread = new(() => Application.Run(_window));
		_windowThread.SetApartmentState(ApartmentState.STA);
		_windowThread.Start();

		Thread.Sleep(50); // HACK: give the window time to initialize

		Handle = _window.Invoke(() => _window.Handle);
	}

	public T Invoke<T>(Func<Form, T> func) => _window.Invoke(() => func(_window));

	public void Dispose()
	{
		if (_windowThread.IsAlive)
		{
			_window.Invoke(Application.ExitThread);
		}
	}
}

file class HiddenWindow : Form
{
	private readonly Subject<Message> _messageSubject = new();
	public IObservable<Message> OnMessage => _messageSubject.AsObservable();

	public HiddenWindow()
	{
		ShowInTaskbar = false;
		Visible = false;
		FormBorderStyle = FormBorderStyle.FixedToolWindow;
		Size = new(0, 0);
		WindowState = FormWindowState.Minimized;
	}

	protected override void WndProc(ref Message m)
	{
		try
		{
			_messageSubject.OnNext(m);
		}
		catch (Exception ex)
		{
			_messageSubject.OnError(ex);
		}

		base.WndProc(ref m);
	}
}

partial class Services
{
	public static IServiceCollection AddWindowsService(this IServiceCollection services) =>
		services.AddSingleton<IWindowsService, WindowsService>();
}
