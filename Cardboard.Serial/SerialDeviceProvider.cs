using Cardboard.Device;
using Cranky;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Serial;

internal partial class SerialDeviceProvider(
	ISerialPortProvider serialPortProvider,
	IOptions<SerialDeviceOptions> serialDeviceConfiguration,
	ILogger<SerialDeviceProvider> logger
) : IDeviceProvider
{
	private readonly PortCache _ports = new(serialPortProvider);
	private readonly DeviceInfoCache _deviceCache = new();
	private readonly ILogger _logger = logger; // hack: https://github.com/dotnet/runtime/issues/91121

	public async Task<IReadOnlyCollection<DeviceInfo>> GetDevices()
	{
		await Update();
		return _deviceCache.Devices.Values.Select(x => x.Info).ToList();
	}

	public async Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> BroadcastWithResponse<T>(
		DeviceCommand message,
		DeserializeFunc<T> deserializeResponse,
		Predicate<DeviceInfo>? predicate
	)
	{
		await Update();

		var destinations = GetDestinationsFromCache(predicate);

		return await Task.WhenAll(
			destinations.Select(async x =>
			{
				using var stream = new MemoryStream();
				await using var writer = stream.CreateDeviceWriter();

				var result = WriteCommand(writer, x.Device, message);

				return new KeyValuePair<DeviceInfo, Result<T>>(
					x.Device.Info,
					result.IsSuccess
						? await x.SerialPort.SendWithResponse(stream.AsMemory(), deserializeResponse)
						: Result.Fail()
				);
			})
		);

		static Result WriteCommand(BinaryWriter writer, CachedDevice device, DeviceCommand message)
		{
			if (!device.WriteCommandIndex(message.CommandId, writer).IsSuccess)
				return Result.Fail();

			writer.Write(message.Data.Span);

			return Result.Success();
		}
	}

	public async Task Broadcast(DeviceCommand message, Predicate<DeviceInfo>? predicate)
	{
		await Update();

		var destinations = GetDestinationsFromCache(predicate);

		await Task.WhenAll(destinations.Select(async x => await x.SerialPort.Send(message.Data)));
	}

	private IEnumerable<MessageDestination> GetDestinationsFromCache(Predicate<DeviceInfo>? predicate) =>
		_ports
			.ConnectedPorts
			.Where(
				x =>
					_deviceCache.Devices.TryGetValue(x.Key, out var cached)
					&& (predicate == null || predicate.Invoke(cached.Info))
			)
			.Select(x => new MessageDestination(x.Value, _deviceCache.Devices[x.Key]));

	private readonly record struct MessageDestination(ISerialPort SerialPort, CachedDevice Device);

	private async Task Update()
	{
		var errors = await _ports.Update(serialDeviceConfiguration.Value.Ports);

		if (errors is not null)
		{
			foreach (var (portName, ex) in errors)
				LogFailedToOpenPort(portName, ex);
		}

		await _deviceCache.Update(_ports.ConnectedPorts);
	}

	private class PortCache(ISerialPortProvider serialPortProvider)
	{
		private Dictionary<string, ISerialPort> _connected = new();
		public IReadOnlyDictionary<string, ISerialPort> ConnectedPorts => _connected;

		public async Task<IEnumerable<(string Port, Exception Exception)>?> Update(
			IReadOnlyCollection<string> ports
		)
		{
			var maxPortCount = ports.Count + _connected.Count;
			var connectedPorts = new Dictionary<string, ISerialPort>(maxPortCount);

			foreach (var (name, port) in _connected.Where(x => x.Value.IsOpen))
				connectedPorts.Add(name, port);

			var newPortNames = ports.Where(p => !connectedPorts.ContainsKey(p));
			var newPorts = await serialPortProvider.GetPorts(
				newPortNames.Where(p => !connectedPorts.ContainsKey(p))
			);

			List<(string, Exception)>? maybeErrors = null;

			foreach (var (portName, result) in newPorts)
			{
				result.Match(
					port =>
					{
						connectedPorts.Add(portName, port);
					},
					ex =>
					{
						(maybeErrors ??= []).Add((portName, ex));
					}
				);
			}

			_connected = connectedPorts;

			return maybeErrors;

			// 	var connectedPorts = _connected.Where(x => x.Value.IsOpen);
			// 	var connectedNames = connectedPorts.Select(x => x.Key).ToHashSet();
			// 	var newPortNames = ports.Where(port => !connectedNames.Contains(port));
			//
			// 	_connected = (await serialPortProvider.GetPorts(newPortNames))
			// 		.Where(x => x.Value.IsSuccess)
			// 		.Select(
			// 			x => new KeyValuePair<string, Result<ISerialPort, Exception>>(x.Key, x.Value.Assert())
			// 		)
			// 		.Concat(_connected)
			// 		.ToDictionary();
		}
	}

	private class DeviceInfoCache
	{
		private readonly Dictionary<string, CachedDevice> _devices = new();
		public IReadOnlyDictionary<string, CachedDevice> Devices => _devices;

		public async Task Update(IEnumerable<KeyValuePair<string, ISerialPort>> ports)
		{
			var results = await Task.WhenAll(
				ports.Select(
					async x =>
						new KeyValuePair<string, Result<DeviceInfo>>(x.Key, await x.Value.GetDeviceInfo())
				)
			);

			foreach (var (key, result) in results)
			{
				result.Match(
					response =>
					{
						_devices[key] = new(
							response,
							key,
							_devices.TryGetValue(key, out var cached) ? cached.TokenManager : new()
						);
					},
					() => _devices.Remove(key)
				);
			}
		}
	}

	private class CachedDevice(DeviceInfo deviceInfo, string portName, TokenManager tokenManager)
	{
		public DeviceInfo Info => deviceInfo;
		public string PortName => portName;
		public TokenManager TokenManager { get; } = tokenManager;

		public Result WriteCommandIndex(CommandId id, BinaryWriter writer)
		{
			if (
				Info.Commands
					.Select((x, i) => (x, i))
					.Where(p => p.x.Id == id)
					.Select(p => (int?)p.i)
					.FirstOrDefault()
				is not { } index
			)
			{
				return Result.Fail();
			}

			switch (Info.Commands.Count)
			{
				case <= byte.MaxValue:
					writer.Write((byte)index);
					break;
				case <= ushort.MaxValue:
					writer.Write((ushort)index);
					break;
				default:
					writer.Write(index);
					break;
			}

			return Result.Success();
		}
	}

	[LoggerMessage(EventId = 0, Level = LogLevel.Error, Message = "Failed to open serial port {PortName}")]
	partial void LogFailedToOpenPort(string portName, Exception exception);
}

public static partial class Services
{
	private static IServiceCollection AddSerialDeviceProvider(this IServiceCollection services) =>
		services.AddSingleton<IDeviceProvider, SerialDeviceProvider>();
}
