using System.Diagnostics;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using Cardboard.Device;
using Cardboard.Serial;
using Cranky;
using Microsoft.Extensions.Logging;
using IDeviceProvider = Cardboard.Device.IDeviceProvider;

namespace Cardboard.Windows;

internal class WindowsSerialDeviceProvider : IDeviceProvider, IDisposable
{
	private List<(DeviceInfo DeviceInfo, ISerialPort SerialPort)> _ports = [];

	private readonly SemaphoreSlim _lock = new(1, 1);

	private readonly AsyncSubject<DevicesChangedEvent> _devicesChangedSubject = new();
	public IObservable<DevicesChangedEvent> OnDevicesChanged => _devicesChangedSubject.AsObservable();

	private readonly IWindowsSerialDeviceFinder _deviceFinder;
	private readonly ILogger<WindowsSerialDeviceProvider> _logger;
	private readonly IDisposable _deviceSubscription;

	public WindowsSerialDeviceProvider(
		IWindowsSerialDeviceFinder deviceFinder,
		ILogger<WindowsSerialDeviceProvider> logger
	)
	{
		_deviceFinder = deviceFinder;
		_logger = logger;

		_deviceSubscription = _deviceFinder.OnMaybeDevicesUpdated.Subscribe(_ => OnMaybeUpdate());
	}

	private void OnMaybeUpdate()
	{
		_ = RefreshPorts(CancellationToken.None);
	}

	public async Task<IReadOnlyCollection<DeviceInfo>> GetDevices(CancellationToken cancellationToken)
	{
		if (!_ports.Any())
			await RefreshPorts(cancellationToken);

		await _lock.WaitAsync(cancellationToken);

		try
		{
			return _ports.Select(x => x.DeviceInfo).ToList();
		}
		finally
		{
			_lock.Release();
		}
	}

	private async Task RefreshPorts(CancellationToken cancellationToken)
	{
		await _lock.WaitAsync(cancellationToken);

		try
		{
			// dispose existing
			await Task.WhenAll(_ports.Select(async x => await x.SerialPort.DisposeAsync()));
			_ports.Clear();

			// get connections
			var newPorts = (
				await Task.WhenAll(
					_deviceFinder
						.GetDevices()
						.Select(x => (ConnectionInfo: x, SerialPort: SystemSerialPort.Create(x.ComPort)))
						.Where(x => x.SerialPort.IsSuccess)
						.Select(async x =>
						{
							var serialPort = x.SerialPort.Assert();
							var result = await serialPort.With(
								async Task<(DeviceInfo DeviceInfo, ISerialPort SerialPort)> (commandStream) =>
								{
									commandStream.Writer.Write((byte)0x00);
									commandStream.Writer.Flush();
									var identityCommand = new IdentityCommand();
									var deviceInfo = identityCommand.Execute(new(), commandStream);

									return (deviceInfo, serialPort);
								},
								cancellationToken
							);

							return result.Match<(DeviceInfo DeviceInfo, ISerialPort SerialPort)?>(
								v => v,
								_ =>
								{
									_logger.LogWarning(
										"Failed to get device info for port {PortName}. Skipping.",
										x.ConnectionInfo.ComPort
									);
									return null;
								}
							);
						})
				)
			).OfType<(DeviceInfo DeviceInfo, ISerialPort SerialPort)>().ToList();

			var addedDevices = newPorts
				.Where(x => _ports.All(y => y.SerialPort.PortName != x.SerialPort.PortName))
				.Select(x => x.DeviceInfo)
				.ToList();
			var removedDevices = _ports
				.Where(x => newPorts.All(y => y.SerialPort.PortName != x.SerialPort.PortName))
				.Select(x => x.DeviceInfo)
				.ToList();

			_ports = newPorts;

			if (addedDevices.Count == 0 || removedDevices.Count == 0)
				_devicesChangedSubject.OnNext(new(addedDevices, removedDevices));
		}
		finally
		{
			_lock.Release();
		}
	}

	public async Task<IReadOnlyCollection<(DeviceId DeviceId, Result<TOut, Exception> Result)>> SendCommand<
		TIn,
		TOut
	>(
		IEnumerable<DeviceId> deviceIds,
		ICommand<TIn, TOut> command,
		TIn input,
		CancellationToken cancellationToken = default
	)
	{
		if (_ports.Count < 1)
			await RefreshPorts(cancellationToken);

		var deviceIdSet = deviceIds.ToHashSet();

		return await Task.WhenAll(
			_ports
				.Where(x => deviceIdSet.Contains(x.DeviceInfo.Id))
				.Select(
					async Task<(DeviceId, Result<TOut, Exception>)> (x) =>
						(
							x.DeviceInfo.Id,
							await x.SerialPort.With<TOut>(
								async commandStream =>
								{
									try
									{
										if (
											Command.GetCommandIndex(x.DeviceInfo, command.Id)
											is not { } commandIndex
										)
										{
											throw new InvalidOperationException(
												"Command not found on device."
											);
										}

#if DEBUG
										var stopwatch = Stopwatch.StartNew();
#endif
										commandStream.Writer.Write((byte)commandIndex.Value);
										commandStream.Writer.Flush();

										var result = command.Execute(input, commandStream);

#if DEBUG
										stopwatch.Stop();
										_logger.LogInformation(
											"Command {Name} took {ElapsedMilliseconds:0.00}ms",
											command.GetType().Name,
											stopwatch.Elapsed.TotalMilliseconds
										);
#endif
										return result;
									}
									catch (Exception ex)
									{
										_logger.LogError(
											ex,
											"Error sending command {Name} to device {DeviceInfoId}",
											command.GetType().Name,
											x.DeviceInfo.Id
										);

										// hold serial port for a timeout duration, then clear the read buffer
										// we don't pass the cancellation token because we always want to wait this long
										await Task.Delay(
											TimeSpan.FromMilliseconds(500),
											CancellationToken.None
										);
										commandStream.ClearReadBuffer();

										throw;
									}
								},
								cancellationToken
							)
						)
				)
		);
	}

	public void Dispose()
	{
		GC.SuppressFinalize(this);
		_deviceSubscription.Dispose();
	}
}
