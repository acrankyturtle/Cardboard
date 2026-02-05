using Cardboard.Device;
using Cardboard.Metadata;

namespace Cardboard.Update.Api.Abstractions;

public sealed class MetadataListResponse
{
	public required IReadOnlyCollection<MetadataListEntry> Entries { get; init; }
}

public sealed class MetadataListEntry
{
	public required DeviceTypeId DeviceTypeId { get; init; }
	public required string Model { get; init; }
	public required IReadOnlyCollection<string> Variants { get; init; }
}

public sealed class DeviceMetadataResponse
{
	public required DeviceMetadata Metadata { get; init; }
}
