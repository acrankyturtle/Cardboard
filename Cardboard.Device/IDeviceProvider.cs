using Cranky;

namespace Cardboard.Device;

public interface IDeviceProvider
{
	Task<IReadOnlyCollection<DeviceInfo>> GetDevices();

	Task Broadcast(DeviceCommand message, Predicate<DeviceInfo>? predicate = null);

	Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> BroadcastWithResponse<T>(
		DeviceCommand message,
		DeserializeFunc<T> deserializeResponse,
		Predicate<DeviceInfo>? predicate = null
	);
}

public static class Extensions_DeviceProvider
{
	public static Task<Result<T>> SendWithResponse<T>(
		this IDeviceProvider provider,
		DeviceId deviceId,
		DeviceCommand message,
		DeserializeFunc<T> deserializeResponse
	) => First(provider.BroadcastWithResponse(message, deserializeResponse, x => x.Id == deviceId));

	private static async Task<Result<T>> First<T>(
		Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> results
	)
	{
		var items = (await results.ConfigureAwait(false)).ToList();
		return items.Count >= 1 ? items.First().Value : Result.Fail();
	}
}
