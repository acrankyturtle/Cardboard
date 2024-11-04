using Cardboard.Device;
using Cardboard.Serial;
using Cranky;
using JetBrains.Annotations;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Mocks;

internal class MockSerialPortProvider(IReadOnlyDictionary<string, SerialPortMockConfiguration> serialPorts)
	: ISerialPortProvider
{
	public Task<IReadOnlyCollection<string>> GetPortNames() =>
		Task.FromResult<IReadOnlyCollection<string>>(serialPorts.Select(x => x.Key).ToList());

	public Task<IReadOnlyDictionary<string, Result<ISerialPort>>> GetPorts(IEnumerable<string> ports) =>
		Task.FromResult<IReadOnlyDictionary<string, Result<ISerialPort>>>(
			ports.ToDictionary(p => p, CreateSerialPort)
		);

	private Result<ISerialPort> CreateSerialPort(string portName) =>
		serialPorts.TryGetValue(portName, out var config)
			? Result.Success((ISerialPort)new MockSerialPort(config))
			: Result.Fail();
}

internal class MockSerialPort(SerialPortMockConfiguration configuration) : ISerialPort
{
	private readonly CommandMap _map = new(configuration.DeviceInfo.Commands);

	public Task<Result<ReadOnlyRentedMemory>> SendWithResponse(SerialMessage msg) =>
		msg switch
		{
			SerialIdentifyMessage => Task.FromResult<Result<ReadOnlyRentedMemory>>(GetIdentityResponse()),
			SerialModuleMessage module
				=> Task.FromResult<Result<ReadOnlyRentedMemory>>(GetModuleResponse(module)),
			_ => throw new ArgumentException("Unsupported message type.", nameof(msg)),
		};

	private ReadOnlyRentedMemory GetIdentityResponse()
	{
		var identityResponse = new DeviceIdentityResponse { Info = configuration.DeviceInfo };

		var memoryStream = new MemoryStream();
		BinaryHelpers.WriteJson(identityResponse, memoryStream);
		var memory = memoryStream.GetBuffer().AsMemory()[..(int)memoryStream.Length];

		return new(memory, () => memoryStream.Dispose());
	}

	private ReadOnlyRentedMemory GetModuleResponse(SerialModuleMessage message)
	{
		if (_map.TryGet(message.Index) is not { } key)
			throw new InvalidOperationException("Module not found.");

		var module = configuration.Modules[key];
		var moduleMessage = new DeviceCommand(key.Id, key.Version, message.Data);
		var buffer = module.ProcessMessage(moduleMessage).Result;

		return buffer;
	}

	public Task Send(SerialMessage msg) =>
		msg switch
		{
			SerialModuleMessage module
				=> Task.FromResult<Result<ReadOnlyRentedMemory>>(GetModuleResponse(module)),
			SerialIdentifyMessage
				=> throw new ArgumentException("Identify message requires a response.", nameof(msg)),
			_ => throw new ArgumentException("Unsupported message type.", nameof(msg)),
		};

	public Task<Result<DeviceInfo>> GetDeviceInfo() =>
		Task.FromResult<Result<DeviceInfo>>(Result.Success(configuration.DeviceInfo));

	public bool IsOpen => true;
}

public static partial class Services
{
	public static IServiceCollection AddMockSerialPortProvider(this IServiceCollection services) =>
		services.AddSingleton<ISerialPortProvider, MockSerialPortProvider>();
}

[PublicAPI]
public record SerialPortMockConfiguration(
	DeviceId Id,
	string Name,
	IReadOnlyDictionary<(CommandId Id, ModuleVersion Version), IMockDeviceModule> Modules
)
{
	public DeviceInfo DeviceInfo { get; } =
		new(Id, Name, Modules.Select(x => new CommandInfo(x.Key.Id, x.Key.Version, x.Value.Name)).ToList());
}

public interface IMockDeviceModule
{
	string Name { get; }

	Task<RentedMemory> ProcessMessage(DeviceCommand message);
}
