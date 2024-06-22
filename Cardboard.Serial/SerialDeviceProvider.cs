using Cardboard.Configuration;
using Cardboard.Device;
using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Serial;

internal class SerialDeviceProvider : IDeviceProvider, IDisposable
{
	private readonly IConfigurationProvider<SerialDeviceConfiguration> _serialDeviceConfiguration;
	private readonly PortCache _ports;
	private readonly DeviceInfoCache _devices;
	private readonly IDisposable _subscription;

	public SerialDeviceProvider(
		ISerialPortProvider serialPortProvider,
		IConfigurationProvider<SerialDeviceConfiguration> serialDeviceConfiguration
	)
	{
		_serialDeviceConfiguration = serialDeviceConfiguration;
		_ports = new(serialPortProvider);

		_subscription = _serialDeviceConfiguration
			.Property
			.OnChangedEvent
			.Subscribe(async _ => await Update());

		_devices = new();
	}

	public void Dispose()
	{
		_subscription.Dispose();
	}

	public async Task<IReadOnlyCollection<DeviceInfo>> GetDevices()
	{
		await Update();
		return _devices.Devices.Values.Select(x => x.Info).ToList();
	}

	public async Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> BroadcastWithResponse<T>(
		ModuleMessage message,
		DeserializeFunc<T> deserializeResponse,
		Predicate<DeviceInfo>? predicate
	)
	{
		await Update();

		var destinations = GetDestinationsFromCache(predicate);
		var messages = GetModuleMessages(destinations, message, true);

		return await Task.WhenAll(
			messages.Select(
				async x =>
					new KeyValuePair<DeviceInfo, Result<T>>(
						x.Destination.Device.Info,
						await x.Destination.SerialPort.SendRequireResponse(x.Message, deserializeResponse)
					)
			)
		);
	}

	public async Task Broadcast(ModuleMessage message, Predicate<DeviceInfo>? predicate)
	{
		await Update();

		var destinations = GetDestinationsFromCache(predicate);
		var messages = GetModuleMessages(destinations, message, false);

		await Task.WhenAll(messages.Select(async x => await x.Destination.SerialPort.Send(x.Message)));
	}

	private IEnumerable<MessageDestination> GetDestinationsFromCache(Predicate<DeviceInfo>? predicate) =>
		_ports
			.ConnectedPorts
			.Where(
				x =>
					_devices.Devices.TryGetValue(x.Key, out var cached)
					&& (predicate == null || predicate.Invoke(cached.Info))
			)
			.Select(x => new MessageDestination(x.Value, _devices.Devices[x.Key]));

	private static IEnumerable<(
		MessageDestination Destination,
		SerialModuleMessage Message
	)> GetModuleMessages(
		IEnumerable<MessageDestination> destinations,
		ModuleMessage message,
		bool requestResponse
	) =>
		destinations
			.Select(x => (Destination: x, Index: x.Device.Map.TryGet(message.ModuleId, message.Version)))
			.Where(x => x.Index is not null)
			.Select(
				x =>
					(
						x.Destination,
						new SerialModuleMessage(
							requestResponse ? x.Destination.Device.TokenManager.Next() : null,
							x.Index!.Value,
							message.Data
						)
					)
			);

	private readonly record struct MessageDestination(ISerialPort SerialPort, CachedDevice Device);

	private async Task Update()
	{
		await _ports.Update(_serialDeviceConfiguration.Value.ActivePorts);
		await _devices.Update(_ports.ConnectedPorts);
	}

	private class PortCache(ISerialPortProvider serialPortProvider)
	{
		private Dictionary<string, ISerialPort> _connected = new();
		public IReadOnlyDictionary<string, ISerialPort> ConnectedPorts => _connected;

		public async Task Update(IReadOnlyCollection<string> ports)
		{
			var connectedPorts = _connected.Where(x => x.Value.IsOpen);
			var connectedNames = connectedPorts.Select(x => x.Key).ToHashSet();
			var newPortNames = ports.Where(port => !connectedNames.Contains(port));

			_connected = (await serialPortProvider.GetPorts(newPortNames))
				.Where(x => x.Value.IsSuccess)
				.Select(x => new KeyValuePair<string, ISerialPort>(x.Key, x.Value.Assert()))
				.Concat(_connected)
				.ToDictionary();
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
		public ModuleMessageMap Map { get; } = new(deviceInfo.Modules);
		public TokenManager TokenManager { get; } = tokenManager;
	}
}

public static partial class Services
{
	private static IServiceCollection AddSerialDeviceProvider(this IServiceCollection services) =>
		services.AddSingleton<IDeviceProvider, SerialDeviceProvider>();
}
