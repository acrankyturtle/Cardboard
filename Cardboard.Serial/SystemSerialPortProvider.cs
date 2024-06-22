using System.IO.Ports;
using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Serial;

internal class SystemSerialPortProvider : ISerialPortProvider
{
	private readonly Dictionary<string, SystemSerialPort> _cache = new();

	public Task<IReadOnlyCollection<string>> GetPortNames() =>
		Task.FromResult((IReadOnlyCollection<string>)SerialPort.GetPortNames());

	public Task<IReadOnlyDictionary<string, Result<ISerialPort>>> GetPorts(IEnumerable<string> ports) =>
		Task.FromResult<IReadOnlyDictionary<string, Result<ISerialPort>>>(
			ports.ToDictionary(p => p, GetSerialPort)
		);

	private Result<ISerialPort> GetSerialPort(string portName) =>
		_cache.TryGetValue(portName, out var cached) && cached.IsRunning
			? Result.Success((ISerialPort)cached)
			: SystemSerialPort
				.Create(portName)
				.Select(serialPort =>
				{
					_cache.Add(portName, serialPort);
					return (ISerialPort)serialPort;
				});
}

public static partial class Services
{
	private static IServiceCollection AddSystemSerialPortProvider(this IServiceCollection services) =>
		services.AddSingleton<ISerialPortProvider, SystemSerialPortProvider>();
}
