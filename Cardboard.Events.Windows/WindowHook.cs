using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

namespace Cardboard.Events.Windows;

public class WindowHook : IDisposable
{
	private WinEventDelegate? dele;
	private IntPtr hookPtr;

	public event Action<ActiveApplicationInfo>? ActiveWindowChanged;

	public void Hook()
	{
		const uint EVENT_SYSTEM_FOREGROUND = 0x0003;
		const uint WINEVENT_OUTOFCONTEXT = 0x0000;

		Unhook();

		dele = WinEventProc;
		hookPtr = SetWinEventHook(
			EVENT_SYSTEM_FOREGROUND,
			EVENT_SYSTEM_FOREGROUND,
			IntPtr.Zero,
			dele,
			0,
			0,
			WINEVENT_OUTOFCONTEXT
		);

		if (hookPtr == IntPtr.Zero)
			throw new Win32Exception(Marshal.GetLastWin32Error());
	}

	public void Unhook()
	{
		if (hookPtr == IntPtr.Zero)
			return;

		UnhookWinEvent(hookPtr);
		hookPtr = IntPtr.Zero;
	}

	private void WinEventProc(
		IntPtr hWinEventHook,
		uint eventType,
		IntPtr hWnd,
		int idObject,
		int idChild,
		uint dwEventThread,
		uint dwmsEventTime
	)
	{
		if (hWnd == IntPtr.Zero)
			return;

		var application = GetAppInfo(hWnd);

		if (application == null)
		{
			// fall back to getting current
			GetCurrent();
		}

		ActiveWindowChanged?.Invoke(application);
	}

	public static ActiveApplicationInfo? GetCurrent() => GetAppInfo(GetForegroundWindow());

	private static ActiveApplicationInfo? GetAppInfo(IntPtr hWnd)
	{
		try
		{
			_ = GetWindowThreadProcessId(hWnd, out var pid);
			if (pid == 0)
				return null;

			// window title
			var title = new StringBuilder(256);
			var titleLength = GetWindowText(hWnd, title, title.Capacity);
			var windowTitle = titleLength > 0 ? title.ToString() : string.Empty;

			var path = GetExecutablePath(pid);

			if (string.IsNullOrEmpty(path))
				return null;

			var timestamp = DateTime.Now;

			return new(windowTitle, path, timestamp);
		}
		catch
		{
			return null;
		}
	}

	// from: https://stackoverflow.com/questions/3399819/access-denied-while-getting-process-path
	private static string GetExecutablePath(int dwProcessId)
	{
		const uint QueryLimitedInformation = 0x00001000;

		StringBuilder buffer = new(1024);
		var hprocess = OpenProcess(QueryLimitedInformation, false, dwProcessId);

		if (hprocess == IntPtr.Zero)
			return string.Empty;

		try
		{
			var size = buffer.Capacity;
			return QueryFullProcessImageName(hprocess, 0, buffer, ref size)
				? buffer.ToString()
				: string.Empty;
		}
		finally
		{
			CloseHandle(hprocess);
		}
	}

	~WindowHook()
	{
		Dispose();
	}

	public void Dispose()
	{
		Unhook();
		ActiveWindowChanged = null;
		GC.SuppressFinalize(this);
	}

	[DllImport("user32.dll")]
	static extern IntPtr SetWinEventHook(
		uint eventMin,
		uint eventMax,
		IntPtr hmodWinEventProc,
		WinEventDelegate lpfnWinEventProc,
		uint idProcess,
		uint idThread,
		uint dwFlags
	);

	[DllImport("user32.dll")]
	static extern bool UnhookWinEvent(IntPtr hWinEventHook);

	[DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
	private static extern int GetWindowThreadProcessId(IntPtr handle, out int processId);

	[DllImport("user32.dll")]
	static extern IntPtr GetForegroundWindow();

	[DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
	private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

	[DllImport("kernel32.dll", SetLastError = true)]
	static extern bool QueryFullProcessImageName(
		[In] IntPtr hProcess,
		[In] int dwFlags,
		[Out] StringBuilder lpExeName,
		ref int lpdwSize
	);

	[DllImport("kernel32.dll", SetLastError = true)]
	public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, int processId);

	[DllImport("kernel32.dll", SetLastError = true)]
	static extern bool CloseHandle(IntPtr hHandle);

	delegate void WinEventDelegate(
		IntPtr hWinEventHook,
		uint eventType,
		IntPtr hWnd,
		int idObject,
		int idChild,
		uint dwEventThread,
		uint dwmsEventTime
	);
}

public record ActiveApplicationInfo(string WindowTitle, string ExecutablePath, DateTime Timestamp);
