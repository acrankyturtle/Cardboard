namespace Cardboard.Update.Api.Abstractions;

public sealed class FirmwareListResponse
{
	public required IReadOnlyCollection<FirmwareListEntry> Entries { get; init; }
}

public sealed class FirmwareListEntry
{
	public required string DeviceTypeId { get; init; }
	public string? Variant { get; init; }
	public required Version LatestVersion { get; init; }
}
