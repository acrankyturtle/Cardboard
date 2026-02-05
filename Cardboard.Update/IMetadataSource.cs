using Cardboard.Device;
using Cardboard.Metadata;

namespace Cardboard.Update;

public interface IMetadataSource
{
	Task<DeviceMetadata?> GetMetadata(
		DeviceTypeId deviceTypeId,
		CancellationToken cancellationToken = default
	);

	Task<IReadOnlyCollection<MetadataListEntry>> GetMetadataList(
		CancellationToken cancellationToken = default
	);
}

public sealed class MetadataListEntry
{
	public required DeviceTypeId DeviceTypeId { get; init; }
	public required string Model { get; init; }
	public required IReadOnlyCollection<string> Variants { get; init; }
}
