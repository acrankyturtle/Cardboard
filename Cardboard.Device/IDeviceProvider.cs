using Cranky;

namespace Cardboard.Device;

public interface IDeviceProvider
{
	Task<IReadOnlyCollection<DeviceInfo>> GetDevices(CancellationToken cancellationToken = default);

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
