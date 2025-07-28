using System.ComponentModel;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Runtime.InteropServices;
using Cardboard.Events;
using Cardboard.Repositories;
using Cardboard.Utilities;
using Microsoft.Extensions.Logging;

namespace Cardboard.Windows;

// NOTE: this is mostly ported from the original keypad project. it probably needs rewritten

internal class InputEventService : IInputEventService, IDisposable
{
	private readonly Dictionary<IntPtr, InputDeviceInfo> _deviceCache = new(); // todo: there is probably an event we should listen for to clear this cache

	private readonly Subject<InputEvent> _input = new();
	private readonly LazyObservable<InputEvent> _lazy;
	public IObservable<InputEvent> OnInput => _lazy;
	private readonly ILogger<InputEventService> _logger;

	private readonly RawInputDevice[] _reg;
	private readonly RawInputDevice[] _unreg;
	private readonly IWindowsService _windowsService;
	private IDisposable? _wndProcSubscription;

	public InputEventService(IWindowsService windowsService, ILogger<InputEventService> logger)
	{
		_windowsService = windowsService;
		_logger = logger;
		_lazy = _input.Lazy(Start, () => Stop());

		_reg =
		[
			new()
			{
				UsagePage = HidUsagePage.GENERIC,
				Usage = HidUsage.Keyboard,
				Flags = RawInputDeviceFlags.INPUTSINK,
				Target = windowsService.Handle,
			},
			new()
			{
				UsagePage = HidUsagePage.GENERIC,
				Usage = HidUsage.Mouse,
				Flags = RawInputDeviceFlags.INPUTSINK,
				Target = windowsService.Handle,
			},
		];

		_unreg = _reg.Select(dev =>
			{
				dev.Flags = RawInputDeviceFlags.REMOVE;
				dev.Target = IntPtr.Zero;
				return dev;
			})
			.ToArray();
	}

	private bool IsRunning => _wndProcSubscription is not null;

	public void Dispose()
	{
		GC.SuppressFinalize(this);
		_lazy.Dispose();
		_input.OnCompleted();
		_input.Dispose();
		Stop(true);
	}

	private void Start()
	{
		if (IsRunning)
		{
			_logger.LogWarning("Input service is already running, cannot start again.");
			return;
		}

		_wndProcSubscription = _windowsService
			.OnMessage.Where(msg => msg.Msg == Win32.WM_INPUT)
			.Subscribe(WndProc);

		var registerResult = Win32.RegisterRawInputDevices(
			_reg,
			(uint)_reg.Length,
			(uint)Marshal.SizeOf(_reg[0])
		);

		if (!registerResult)
		{
			_logger.LogError(
				"Failed to register raw input device(s). Error: {Error}",
				Marshal.GetLastWin32Error()
			);
			return;
		}

		_logger.LogInformation("Raw input registered.");
	}

	private void Stop(bool suppressLog = false)
	{
		if (!IsRunning)
		{
			if (!suppressLog)
				_logger.LogWarning("Input service is not running, cannot stop.");

			return;
		}

		_wndProcSubscription?.Dispose();
		_wndProcSubscription = null;

		var unregisterResult = Win32.RegisterRawInputDevices(
			_unreg,
			(uint)_unreg.Length,
			(uint)Marshal.SizeOf(_unreg[0])
		);

		if (!unregisterResult)
		{
			_logger.LogError(
				"Failed to unregister raw input device(s). Error: {Error}",
				Marshal.GetLastWin32Error()
			);
			return;
		}

		_logger.LogInformation("Raw input unregistered.");
	}

	private void WndProc(Message message)
	{
		switch (message.Msg)
		{
			case Win32.WM_INPUT:
				var dwSize = 0;
				var rihSize = Marshal.SizeOf<RawInputHeader>();

				_ = Win32.GetRawInputData(
					message.LParam,
					DataCommand.RID_INPUT,
					IntPtr.Zero,
					ref dwSize,
					rihSize
				);
				var result = Win32.GetRawInputData(
					message.LParam,
					DataCommand.RID_INPUT,
					out var rawBuffer,
					ref dwSize,
					rihSize
				);

				if (result != dwSize)
					throw new Win32Exception(Marshal.GetLastWin32Error());

				var deviceInfo = GetDeviceInfo(rawBuffer.header.hDevice);

				if (deviceInfo is null)
					// todo: log? we received an event for a device that no longer exists... this shouldn't really happen
					return;

				if (GetInputEvent(rawBuffer) is not var (key, state))
					return;

				var inputEvent = new InputEvent(deviceInfo, key, state);
				OnKeyEvent(inputEvent);
				break;
		}
	}

	private (InputKey Key, InputKeyState State)? GetInputEvent(InputData rawBuffer)
	{
		var keyEvent = rawBuffer.header.dwType switch
		{
			0u => GetMouseKeyEvent(rawBuffer.data.Mouse),
			1u => GetKeyboardKeyEvent(rawBuffer.data.Keyboard),
			2u => GetHidKeyEvent(rawBuffer.data.Hid),
			_ => null,
		};

		if (keyEvent is not var (key, state))
			return null;

		return (key, state);
	}

	private static (InputKey Key, InputKeyState State)? GetMouseKeyEvent(RawMouse mouse)
	{
		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.LeftDown))
			return (InputKey.LeftButton, InputKeyState.Press);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.LeftUp))
			return (InputKey.LeftButton, InputKeyState.Release);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.RightDown))
			return (InputKey.RightButton, InputKeyState.Press);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.RightUp))
			return (InputKey.RightButton, InputKeyState.Release);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.MiddleDown))
			return (InputKey.MiddleButton, InputKeyState.Press);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.MiddleUp))
			return (InputKey.MiddleButton, InputKeyState.Release);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.Button4Down))
			return (InputKey.ExtraButton1, InputKeyState.Press);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.Button4Up))
			return (InputKey.ExtraButton1, InputKeyState.Release);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.Button5Down))
			return (InputKey.ExtraButton2, InputKeyState.Press);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.Button5Up))
			return (InputKey.ExtraButton2, InputKeyState.Release);

		if (mouse.ButtonFlags.HasFlag(RawMouseButtons.MouseWheel) && mouse.ButtonData != 0)
			return (
				mouse.ButtonData > 0 ? InputKey.ScrollUp : InputKey.ScrollDown,
				InputKeyState.PressAndRelease
			);

		return null;
	}

	private (InputKey Key, InputKeyState State)? GetKeyboardKeyEvent(RawKeyboard keyboard)
	{
		if (keyboard.VKey == Win32.KEYBOARD_OVERRUN_MAKE_CODE)
			return null;

		var isBreakBitSet = (keyboard.Flags & Win32.RI_KEY_BREAK) != 0;
		return ((InputKey)keyboard.VKey, isBreakBitSet ? InputKeyState.Release : InputKeyState.Press);
	}

	private (InputKey Key, InputKeyState State)? GetHidKeyEvent(RawHID hid)
	{
		// todo: maybe some day
		return null;
	}

	private InputDeviceInfo? GetDeviceInfo(IntPtr handle)
	{
		if (_deviceCache.TryGetValue(handle, out var cached))
			return cached;

		var pcbSize = 0u;
		var result = Win32.GetRawInputDeviceInfo(
			handle,
			RawInputDeviceInfo.RIDI_DEVICENAME,
			IntPtr.Zero,
			ref pcbSize
		);

		if (result < 0)
			return null;

		var pData = Marshal.AllocHGlobal((int)pcbSize);

		try
		{
			var result2 = Win32.GetRawInputDeviceInfo(
				handle,
				RawInputDeviceInfo.RIDI_DEVICENAME,
				pData,
				ref pcbSize
			);
			if (result2 < 0)
				return null;

			var deviceName = Marshal.PtrToStringAnsi(pData);

			if (deviceName == null)
				return null;

			var deviceDescription = Win32.GetDeviceDescription(deviceName);

			var deviceInfo = new InputDeviceInfo
			{
				Vid = "VID",
				Pid = "PID",
				Serial = "SERIAL",
				Description = deviceDescription,
			};

			_deviceCache.Add(handle, deviceInfo);
			return deviceInfo;
		}
		finally
		{
			Marshal.FreeHGlobal(pData);
		}
	}

	private void OnKeyEvent(InputEvent e)
	{
		Task.Run(() => _input.OnNext(e))
			.ContinueWith(
				t =>
				{
					if (t.IsFaulted)
						_logger.LogError(
							t.Exception,
							"An error occurred while processing input event: {Event}",
							e
						);
				},
				TaskContinuationOptions.OnlyOnFaulted
			);
	}
}
