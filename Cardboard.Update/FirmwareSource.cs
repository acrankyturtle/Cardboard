using Cardboard.Device;

namespace Cardboard.Update;

public interface IFirmwareSource
{
	Task<Version?> GetLatestVersion(
		DeviceTypeId deviceType,
		string? variant,
		CancellationToken cancellationToken = default
	);

	Task<DeviceFirmware?> GetFirmware(
		DeviceTypeId deviceType,
		string? variant,
		Version version,
		CancellationToken cancellationToken = default
	);
}
