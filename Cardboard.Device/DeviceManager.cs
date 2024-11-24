using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Device;

public interface IDeviceManager
{
	Task<IReadOnlyCollection<DeviceInfo>> GetDevices();

	Task<IEnumerable<KeyValuePair<DeviceId, Result<TResponse>>>> ExecuteCommand<TResponse>(
		ICommandWithResponse<TResponse> command,
		IReadOnlyCollection<DeviceId>? filter = null,
		CancellationToken cancellationToken = default
	);

	Task<IEnumerable<KeyValuePair<DeviceId, Result>>> ExecuteCommand(
		ICommandNoResponse command,
		IReadOnlyCollection<DeviceId>? filter = null,
		CancellationToken cancellationToken = default
	);
}

internal class DeviceManager(IEnumerable<IDeviceProvider> devices) : IDeviceManager
{
	private IReadOnlyCollection<IDeviceProvider> Providers { get; } = devices.ToList();

	public async Task<IReadOnlyCollection<DeviceInfo>> GetDevices() =>
		(await Task.WhenAll(Providers.Select(async x => await x.GetDevices()))).SelectMany(x => x).ToList();

	public async Task<IEnumerable<KeyValuePair<DeviceId, Result<TResponse>>>> ExecuteCommand<TResponse>(
		ICommandWithResponse<TResponse> command,
		IReadOnlyCollection<DeviceId>? filter = null,
		CancellationToken cancellationToken = default
	) =>
		(
			await Task.WhenAll(
				Providers.Select(async x => await x.ExecuteCommand(command, filter, cancellationToken))
			)
		).SelectMany(x => x);

	public async Task<IEnumerable<KeyValuePair<DeviceId, Result>>> ExecuteCommand(
		ICommandNoResponse command,
		IReadOnlyCollection<DeviceId>? filter = null,
		CancellationToken cancellationToken = default
	) =>
		(
			await Task.WhenAll(
				Providers.Select(async x => await x.ExecuteCommand(command, filter, cancellationToken))
			)
		).SelectMany(x => x);
}

public delegate T DeserializeFunc<out T>(ReadOnlyMemory<byte> data);

static partial class Services
{
	private static IServiceCollection AddDeviceManager(this IServiceCollection services) =>
		services.AddSingleton<IDeviceManager, DeviceManager>();
}
