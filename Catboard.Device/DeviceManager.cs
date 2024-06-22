using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Catboard.Device;

public interface IDeviceManager
{
	Task<IReadOnlyCollection<DeviceInfo>> GetDevices();
	Task Broadcast(ModuleMessage message, Predicate<DeviceInfo>? predicate);

	Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> BroadcastWithResponse<T>(
		ModuleMessage message,
		DeserializeFunc<T> deserializeResponse,
		Predicate<DeviceInfo> predicate
	);
}

internal class DeviceManager(IEnumerable<IDeviceProvider> devices) : IDeviceManager
{
	private IReadOnlyCollection<IDeviceProvider> Providers { get; } = devices.ToList();

	public async Task<IReadOnlyCollection<DeviceInfo>> GetDevices()
	{
		return (await Task.WhenAll(Providers.Select(async x => await x.GetDevices())))
			.SelectMany(x => x)
			.ToList();
	}

	public async Task Broadcast(ModuleMessage message, Predicate<DeviceInfo>? predicate)
	{
		await Task.WhenAll(Providers.Select(async x => await x.Broadcast(message, predicate)));
	}

	public async Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> BroadcastWithResponse<T>(
		ModuleMessage message,
		DeserializeFunc<T> deserializeResponse,
		Predicate<DeviceInfo> predicate
	)
	{
		return (
			await Task.WhenAll(
				Providers.Select(
					async x => await x.BroadcastWithResponse(message, deserializeResponse, predicate)
				)
			)
		).SelectMany(x => x);
	}
}

public delegate T DeserializeFunc<out T>(ReadOnlyMemory<byte> data);

static partial class Services
{
	private static IServiceCollection AddDeviceManager(this IServiceCollection services) =>
		services.AddSingleton<IDeviceManager, DeviceManager>();
}
