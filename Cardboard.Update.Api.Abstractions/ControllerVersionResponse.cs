namespace Cardboard.Update.Api.Abstractions;

public sealed class ControllerVersionResponse
{
	public required string Version { get; init; }
	public required bool IsPreview { get; init; }
}
