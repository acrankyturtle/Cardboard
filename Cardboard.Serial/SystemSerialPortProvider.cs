using System.IO.Ports;
using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Serial;

internal class SystemSerialPortProvider : ISerialPortProvider
{
	private readonly Dictionary<string, SystemSerialPort> _cache = new();

	public Task<IReadOnlyCollection<string>> GetPortNames() =>
		Task.FromResult((IReadOnlyCollection<string>)SerialPort.GetPortNames());

	public Task<IEnumerable<(string Port, Result<ISerialPort, Exception> Result)>> GetPorts(
		IEnumerable<string> ports
	) =>
		Task.FromResult<IEnumerable<(string Port, Result<ISerialPort, Exception> Result)>>(
			ports.Select(p => (p, GetSerialPort(p)))
		);

	private Result<ISerialPort, Exception> GetSerialPort(string portName)
	{
		if (_cache.TryGetValue(portName, out var cached))
		{
			if (cached.IsOpen)
				return Result.Success((ISerialPort)cached);

			_cache.Remove(portName);
		}

		return SystemSerialPort
			.Create(portName)
			.Select(serialPort =>
			{
				_cache.Add(portName, serialPort);
				return (ISerialPort)serialPort;
			});
	}
}

public static partial class Services
{
	private static IServiceCollection AddSystemSerialPortProvider(this IServiceCollection services) =>
		services.AddSingleton<ISerialPortProvider, SystemSerialPortProvider>();
}
