using System.Diagnostics;
using System.Reactive.Linq;
using Cardboard.Device;
using Cardboard.Serial;
using Cardboard.Services;
using Cardboard.Utilities;
using Cranky;
using Microsoft.Extensions.Logging;
using IDeviceProvider = Cardboard.Device.IDeviceProvider;

namespace Cardboard.Windows;

internal class WindowsSerialDeviceProvider : IDeviceProvider, IInitializable, IDisposable
{
	private readonly record struct DeviceEntry(DeviceInfo DeviceInfo, ISerialPort SerialPort);

	private List<DeviceEntry> _ports = [];

	private readonly SemaphoreSlim _lock = new(1, 1);

	private readonly AsyncDispatchSubject<DevicesChangedEvent> _devicesChangedSubject = new();
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

		_deviceSubscription = _deviceFinder.OnMaybeDevicesUpdated.SubscribeAsync(async _ =>
			await RefreshPorts(CancellationToken.None)
		);
	}

	private async Task RefreshPorts(CancellationToken cancellationToken)
	{
		await _lock.WaitAsync(cancellationToken);

		List<(string PortName, DeviceInfo DeviceInfo)> existingPorts;

		try
		{
			existingPorts = _ports.Select(x => (x.SerialPort.PortName, x.DeviceInfo)).ToList();

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
								Task<DeviceEntry> (commandStream) =>
								{
									commandStream.Writer.Write((byte)0x00);
									commandStream.Writer.Flush();
									var identityCommand = new IdentityCommand();
									var deviceInfo = identityCommand.Execute(new(), commandStream);

									return Task.FromResult<DeviceEntry>(new(deviceInfo, serialPort));
								},
								cancellationToken
							);

							return result.Match<DeviceEntry?>(
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
			).OfType<DeviceEntry>().ToList();
			_ports = newPorts;
		}
		finally
		{
			_lock.Release();
		}

		var addedDevices = _ports
			.Where(x => existingPorts.All(y => y.PortName != x.SerialPort.PortName))
			.Select(x => x.DeviceInfo)
			.ToList();
		var removedDevices = existingPorts
			.Where(x => _ports.All(y => y.SerialPort.PortName != x.PortName))
			.Select(x => x.DeviceInfo)
			.ToList();

		if (addedDevices.Count != 0 || removedDevices.Count != 0)
			_devicesChangedSubject.OnNext(new(addedDevices, removedDevices));
	}

	public async Task Initialize()
	{
		await RefreshPorts(CancellationToken.None);
	}

	public async Task Reinitialize() => await Initialize();

	public Task<IReadOnlyCollection<DeviceInfo>> GetDevices(CancellationToken cancellationToken) =>
		Task.FromResult<IReadOnlyCollection<DeviceInfo>>(_ports.Select(x => x.DeviceInfo).ToList());

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
		_lock.Dispose();
	}
}
