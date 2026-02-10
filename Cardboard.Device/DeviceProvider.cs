using Cardboard.Utilities;

namespace Cardboard.Device;

public interface IDeviceProvider
{
	IObservable<DevicesChangedEvent> OnDevicesChanged { get; }

	Task<IReadOnlyCollection<DeviceInfo>> GetDevices(CancellationToken cancellationToken = default);

	Task<IReadOnlyCollection<(DeviceId DeviceId, Result<TOut, Exception> Result)>> SendCommand<TIn, TOut>(
		IEnumerable<DeviceId> deviceIds,
		ICommand<TIn, TOut> command,
		TIn input,
		CancellationToken cancellationToken = default
	);
}

public readonly record struct DevicesChangedEvent(
	IReadOnlyCollection<DeviceInfo> Added,
	IReadOnlyCollection<DeviceInfo> Removed
)
{
	public override string ToString() =>
		$"{nameof(DevicesChangedEvent)}: {{ {nameof(Added)}: [{Added.Count}], {nameof(Removed)}: {Removed.Count} }}";
}
