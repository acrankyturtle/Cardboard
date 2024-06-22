using Cranky;
using StronglyTypedIds;

namespace Catboard.Device;

public interface IDeviceProvider
{
	Task<IReadOnlyCollection<DeviceInfo>> GetDevices();

	Task Broadcast(ModuleMessage message, Predicate<DeviceInfo>? predicate);

	Task<IEnumerable<KeyValuePair<DeviceInfo, Result<T>>>> BroadcastWithResponse<T>(
		ModuleMessage message,
		DeserializeFunc<T> deserializeResponse,
		Predicate<DeviceInfo> predicate
	);
}

public record DeviceInfo(DeviceId Id, string Name, IReadOnlyCollection<ModuleInfo> Modules);

public record ModuleInfo(ModuleId Id, ModuleVersion Version, string Name);

/// <summary>
/// A globally unique identifier associated with a specific device.
/// </summary>
[StronglyTypedId]
public readonly partial struct DeviceId;

[StronglyTypedId]
public readonly partial struct ModuleId;

[StronglyTypedId(Template.String)]
public readonly partial struct ModuleVersion;

public static class Extensions_DeviceProvider
{
	public static Task<Result<T>> SendWithResponse<T>(
		this IDeviceProvider provider,
		DeviceId deviceId,
		ModuleMessage message,
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
