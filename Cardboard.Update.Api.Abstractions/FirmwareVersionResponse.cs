namespace Cardboard.Update.Api.Abstractions;

public sealed class FirmwareVersionResponse
{
	/// <summary>
	/// Semantic version string in the format "major.minor.patch".
	/// </summary>
	public required string Version { get; init; }
	public required bool IsPreview { get; init; }

	/// <summary>
	/// SHA256 hash of the firmware file in lowercase hex format.
	/// </summary>
	public required string Sha256 { get; init; }
}
