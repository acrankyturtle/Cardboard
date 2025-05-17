using System.Diagnostics;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Runtime.InteropServices;
using System.Text;
using Cardboard.Windows;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Events.Windows;

internal sealed class Application : IApplicationEventService, IDisposable
{
	private readonly WindowHook _windowHook;

	private readonly Subject<ApplicationChangedEvent> _applicationChangedSubject = new();
	public IObservable<ApplicationChangedEvent> OnApplicationChanged =>
		_applicationChangedSubject.AsObservable();

	public Application(IWindowsService windowsService)
	{
		// hook needs to be enabled on the form thread
		_windowHook = windowsService.Invoke(() =>
		{
			var windowHook = new WindowHook();
			windowHook.Hook();
			windowHook.ActiveWindowChanged += appInfo =>
				_applicationChangedSubject.OnNext(new(appInfo.ExecutablePath));

			return windowHook;
		});
	}

	public void Dispose()
	{
		_windowHook.Dispose();
		_applicationChangedSubject.Dispose();
	}
}

internal sealed partial class ActiveApplicationTracker : IDisposable
{
	private readonly IntPtr _hookHandle;
	private ActiveApplicationInfo? _lastAppInfo;
	public event Action<ActiveApplicationInfo>? ActiveApplicationChanged;

	[LibraryImport("user32.dll", SetLastError = true)]
	private static partial uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

	[DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
	private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

	[LibraryImport("user32.dll", SetLastError = true)]
	private static partial IntPtr SetWinEventHook(
		uint eventMin,
		uint eventMax,
		IntPtr hmodWinEventProc,
		WinEventDelegate lpfnWinEventProc,
		uint idProcess,
		uint idThread,
		uint dwFlags
	);

	[DllImport("user32.dll", SetLastError = true)]
	private static extern bool UnhookWinEvent(IntPtr hWinEventHook);

	private const uint EVENT_SYSTEM_FOREGROUND = 0x0003;
	private const uint WINEVENT_OUTOFCONTEXT = 0x0000;

	private delegate void WinEventDelegate(
		IntPtr hWinEventHook,
		uint eventType,
		IntPtr hwnd,
		int idObject,
		int idChild,
		uint dwEventThread,
		uint dwmsEventTime
	);

	public ActiveApplicationTracker()
	{
		_hookHandle = SetWinEventHook(
			EVENT_SYSTEM_FOREGROUND,
			EVENT_SYSTEM_FOREGROUND,
			IntPtr.Zero,
			WinEventProc,
			0,
			0,
			WINEVENT_OUTOFCONTEXT
		);

		if (_hookHandle == IntPtr.Zero)
		{
			throw new InvalidOperationException("Failed to set WinEvent hook.");
		}
	}

	private void WinEventProc(
		IntPtr hWinEventHook,
		uint eventType,
		IntPtr hwnd,
		int idObject,
		int idChild,
		uint dwEventThread,
		uint dwmsEventTime
	)
	{
		if (eventType != EVENT_SYSTEM_FOREGROUND)
			return;

		var appInfo = GetActiveApplicationInfo(hwnd);

		if (appInfo == null || !IsDifferentFromLast(appInfo))
			return;

		_lastAppInfo = appInfo;
		ActiveApplicationChanged?.Invoke(appInfo);
	}

	private static ActiveApplicationInfo? GetActiveApplicationInfo(IntPtr hWnd)
	{
		try
		{
			if (hWnd == IntPtr.Zero)
				return null;

			// window title
			var title = new StringBuilder(256);
			var titleLength = GetWindowText(hWnd, title, title.Capacity);
			var windowTitle = titleLength > 0 ? title.ToString() : string.Empty;

			// process id
			var hresult = GetWindowThreadProcessId(hWnd, out var processId);

			if (hresult != 0 || processId == 0)
				return null;

			// executable path
			using var process = Process.GetProcessById((int)processId);
			var exePath = process.MainModule?.FileName ?? string.Empty;

			return new(windowTitle, exePath, DateTime.Now);
		}
		catch (Exception)
		{
			// todo: handle
#if DEBUG
			throw;
#endif
			return null;
		}
	}

	private bool IsDifferentFromLast(ActiveApplicationInfo newInfo)
	{
		if (_lastAppInfo == null)
			return true;
		return newInfo.WindowTitle != _lastAppInfo.WindowTitle
			|| newInfo.ExecutablePath != _lastAppInfo.ExecutablePath;
	}

	public void Dispose()
	{
		if (_hookHandle != IntPtr.Zero)
		{
			UnhookWinEvent(_hookHandle);
		}
	}
}

partial class Services
{
	private static IServiceCollection AddApplicationEvents(this IServiceCollection services) =>
		services.AddSingleton<IApplicationEventService, Application>();
}
