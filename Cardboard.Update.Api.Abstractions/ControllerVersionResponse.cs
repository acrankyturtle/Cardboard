namespace Cardboard.Update.Api.Abstractions;

public sealed class ControllerVersionResponse
{
	public required string Version { get; init; }
	public required bool IsPreview { get; init; }
	/// <summary>
	/// SHA256 hash of the controller executable in lowercase hex format.
	/// </summary>
	public required string Sha256 { get; init; }
}
