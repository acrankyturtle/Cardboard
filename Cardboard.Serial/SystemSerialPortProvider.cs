using System.IO.Ports;
using Cranky;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cardboard.Serial;

internal class SystemSerialPortProvider(ILogger<SystemSerialPortProvider> logger) : ISerialPortProvider
{
	private readonly Dictionary<string, SystemSerialPort> _cache = new();

	public Task<IReadOnlyCollection<string>> GetPortNames(CancellationToken cancellationToken) =>
		Task.FromResult((IReadOnlyCollection<string>)SerialPort.GetPortNames());

	public async Task<IEnumerable<(string Port, Result<ISerialPort, Exception> Result)>> GetPorts(
		IEnumerable<string> ports,
		CancellationToken cancellationToken
	) =>
		await Task.WhenAll<(string Port, Result<ISerialPort, Exception> Result)>(
			ports.Select(async p => (p, await GetSerialPort(p, cancellationToken)))
		);

	private async Task<Result<ISerialPort, Exception>> GetSerialPort(
		string portName,
		CancellationToken cancellationToken = default
	)
	{
		if (_cache.TryGetValue(portName, out var cached))
		{
			if (cached.IsOpen)
				return Result.Success((ISerialPort)cached);

			_cache.Remove(portName);
		}

		return (await SystemSerialPort.Create(portName, cancellationToken)).Select(serialPort =>
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
