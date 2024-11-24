using System.Diagnostics;
using Cardboard.Device;
using Cranky;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Serial;

internal partial class SerialDeviceProvider(
	ISerialPortProvider serialPortProvider,
	IOptions<SerialDeviceOptions> serialDeviceConfiguration,
	IEnumerable<ICommandImplementation<SerialDeviceProvider>> impls,
	ILogger<SerialDeviceProvider> logger
) : IDeviceProvider
{
	private readonly CachedPortProvider _ports = new(serialPortProvider);
	private readonly CommandImplementations<SerialDeviceProvider> _commands =
		new(new DefaultCommandImplementation(), impls);
	private readonly ILogger _logger = logger; // hack: https://github.com/dotnet/runtime/issues/91121

	public async Task<IReadOnlyCollection<DeviceInfo>> GetDevices(CancellationToken cancellationToken)
	{
		await _ports.Update([], cancellationToken);
		await EnsureUpToDate(cancellationToken);
		return _ports.Ports.Select(x => x.Info).ToList();
	}

	public async Task<IEnumerable<KeyValuePair<DeviceId, Result<TResponse>>>> ExecuteCommand<TResponse>(
		ICommandWithResponse<TResponse> command,
		IReadOnlyCollection<DeviceId>? filter,
		CancellationToken cancellationToken
	)
	{
		await EnsureUpToDate(cancellationToken);

		var destinations = filter is null
			? _ports.Ports
			: _ports.Ports.Where(x => filter.Contains(x.Info.Id));

		return await Task.WhenAll(
			destinations.Select(async device =>
			{
				// get implementation
				var result = await device
					.SerialPort
					.With(
						async (reader, writer) =>
						{
							writer.WriteGuid(command.Id.Value);
							return (await _commands.Execute(command, reader, writer)).Match(
								memory =>
								{
									var result = command.GetResult(memory.Data.Span);
									memory.Dispose();
									return result;
								},
								ex =>
								{
									LogCommandException(device.Info.Id, command.Id, ex);
									return Result<TResponse>.Fail;
								}
							);
						},
						true,
						cancellationToken
					);

				return new KeyValuePair<DeviceId, Result<TResponse>>(
					device.Info.Id,
					result.Match<Result<TResponse>>(x => Result.Success(x), _ => Result<TResponse>.Fail)
				);
			})
		);
	}

	public async Task<IEnumerable<KeyValuePair<DeviceId, Result>>> ExecuteCommand(
		ICommandNoResponse command,
		IReadOnlyCollection<DeviceId>? filter,
		CancellationToken cancellationToken
	)
	{
		await EnsureUpToDate(cancellationToken);

		var destinations = filter is null
			? _ports.Ports
			: _ports.Ports.Where(x => filter.Contains(x.Info.Id));

		return await Task.WhenAll(
			destinations.Select(async device =>
			{
				var result = await device
					.SerialPort
					.With<Result>(
						async (reader, writer) =>
						{
							writer.WriteGuid(command.Id.Value);
							return (await _commands.Execute(command, reader, writer)).Match<Result>(
								x =>
								{
									Debug.Assert(x.Data.IsEmpty);
									x.Dispose();
									return Result.Success();
								},
								ex =>
								{
									LogCommandException(device.Info.Id, command.Id, ex);
									return Result.Fail();
								}
							);
						},
						true,
						cancellationToken
					);

				return new KeyValuePair<DeviceId, Result>(
					device.Info.Id,
					result.IsSuccess ? Result.Success() : Result.Fail()
				);
			})
		);
	}

	private async Task EnsureUpToDate(CancellationToken cancellationToken)
	{
		var errors = await _ports.Update(serialDeviceConfiguration.Value.Ports, cancellationToken);

		if (errors is not null)
		{
			foreach (var (portName, ex) in errors)
				LogFailedToOpenPort(portName, ex);
		}
	}

	private class CachedPortProvider(ISerialPortProvider serialPortProvider)
	{
		private List<CachedDevice> _ports = [];
		public IReadOnlyCollection<CachedDevice> Ports => _ports;

		public async Task<IEnumerable<(string Port, Exception? Exception)>?> Update(
			IReadOnlyCollection<string> ports,
			CancellationToken cancellationToken
		)
		{
			var portLookup = _ports.ToLookup(x => x.SerialPort.IsOpen && ports.Contains(x.PortName));

			var disconnectedPorts = portLookup[false];
			foreach (var port in disconnectedPorts)
				port.Dispose();

			var connectedPorts = portLookup[true].ToList();
			var newPortNames = ports.Where(p => connectedPorts.All(x => x.PortName != p));
			var newPorts = await serialPortProvider.GetPorts(newPortNames, cancellationToken);

			List<(string, Exception?)>? maybeErrors = null;

			foreach (var (portName, result) in newPorts)
			{
				await result.Match(
					async port =>
					{
						(await GetDeviceInfo(port, cancellationToken)).Match(
							x => connectedPorts.Add(new(port.Name, x, port)),
							x => AddError(portName, x)
						);
					},
					ex =>
					{
						AddError(portName, ex);
						return Task.CompletedTask;
					}
				);
			}

			_ports = connectedPorts;

			return maybeErrors;

			void AddError(string portName, Exception? ex)
			{
				(maybeErrors ??= []).Add((portName, ex));
			}
		}

		private async Task<Result<DeviceInfo, Exception?>> GetDeviceInfo(
			ISerialPort port,
			CancellationToken cancellationToken
		) =>
			(
				await port.With(
					(reader, writer) =>
					{
						writer.BaseStream.Write(_deviceIdentityCmdId.Span);
						writer.Flush();

						var len = reader.ReadUInt16();
						var response = reader.ReadJson<DeviceIdentityResponse>(len);

						return Task.FromResult<Result<DeviceInfo>>(response.Info);
					},
					true,
					cancellationToken
				)
			);

		private static readonly ReadOnlyMemory<byte> _deviceIdentityCmdId = new byte[16]
		{
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
			0xFF,
		};

		private class DeviceIdentityResponse
		{
			public required DeviceInfo Info { get; init; }
		}
	}

	private class CachedDevice(string portName, DeviceInfo deviceInfo, ISerialPort serialPort) : IDisposable
	{
		public string PortName => portName;
		public DeviceInfo Info => deviceInfo;
		public ISerialPort SerialPort => serialPort;

		public void Dispose()
		{
			serialPort.Dispose();
		}
	}

	[LoggerMessage(EventId = 0, Level = LogLevel.Error, Message = "Failed to open serial port {PortName}")]
	partial void LogFailedToOpenPort(string portName, Exception? exception);

	[LoggerMessage(EventId = 1, Level = LogLevel.Error, Message = "Failed to identify port {PortName}.")]
	partial void LogIdentifyException(string portName, Exception? exception);

	[LoggerMessage(
		EventId = 2,
		Level = LogLevel.Error,
		Message = "Failed to execute command {CommandId} on device {InfoId}"
	)]
	partial void LogCommandException(DeviceId infoId, CommandId commandId, Exception? exception);
}

public static partial class Services
{
	private static IServiceCollection AddSerialDeviceProvider(this IServiceCollection services) =>
		services.AddDeviceProvider<SerialDeviceProvider>();
}
