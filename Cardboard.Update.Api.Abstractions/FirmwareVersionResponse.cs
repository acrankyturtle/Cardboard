namespace Cardboard.Update.Api.Abstractions;

public sealed class FirmwareVersionResponse
{
	public required uint Version { get; init; }
	public required bool IsPreview { get; init; }
}
