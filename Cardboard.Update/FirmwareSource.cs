using Cardboard.Device;

namespace Cardboard.Update;

public interface IFirmwareSource
{
	Task<uint?> GetLatestVersion(
		DeviceTypeId deviceType,
		uint? variant,
		CancellationToken cancellationToken = default
	);

	Task<DeviceFirmware?> GetFirmware(
		DeviceTypeId deviceType,
		uint? variant,
		uint version,
		CancellationToken cancellationToken = default
	);
}
