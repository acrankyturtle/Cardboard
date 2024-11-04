using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Device;

public interface IDeviceManager
{
	Task<IReadOnlyCollection<DeviceInfo>> GetDevices();
	Task Broadcast(DeviceCommand message, Predicate<DeviceInfo>? predicate = null);

	Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> BroadcastWithResponse<T>(
		DeviceCommand message,
		DeserializeFunc<T> deserializeResponse,
		Predicate<DeviceInfo>? predicate = null
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

	public async Task Broadcast(DeviceCommand message, Predicate<DeviceInfo>? predicate)
	{
		await Task.WhenAll(Providers.Select(async x => await x.Broadcast(message, predicate)));
	}

	public async Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> BroadcastWithResponse<T>(
		DeviceCommand message,
		DeserializeFunc<T> deserializeResponse,
		Predicate<DeviceInfo>? predicate
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

public static class Extensions_IDeviceManager
{
	public static async Task<Result<T>> SendWithResponse<T>(
		this IDeviceManager manager,
		DeviceId deviceId,
		DeviceCommand message,
		DeserializeFunc<T> deserializeResponse
	) =>
		(await manager.BroadcastWithResponse(message, deserializeResponse, x => x.Id == deviceId))
			.Single()
			.Value;

	public static async Task Send(this IDeviceManager manager, DeviceId deviceId, DeviceCommand message) =>
		await manager.Broadcast(message, x => x.Id == deviceId);
}
