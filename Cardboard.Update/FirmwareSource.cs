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

	Task<IReadOnlyCollection<DeviceFirmwareListEntry>> GetFirmwareList(
		CancellationToken cancellationToken = default
	);
}

public sealed class DeviceFirmwareListEntry
{
	public required DeviceTypeId DeviceTypeId { get; set; }
	public required string? Variant { get; set; }
	public required Version LatestVersion { get; set; }
}
