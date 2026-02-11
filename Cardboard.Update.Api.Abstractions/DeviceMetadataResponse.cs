using Cardboard.Metadata;

namespace Cardboard.Update.Api.Abstractions;

public sealed class MetadataListResponse
{
	public required IReadOnlyCollection<MetadataListEntry> Entries { get; init; }
}

public sealed class DeviceMetadataResponse
{
	public required DeviceMetadata Metadata { get; init; }
}
