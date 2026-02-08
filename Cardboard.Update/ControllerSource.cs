namespace Cardboard.Update;

public interface IControllerUpdateSource
{
	Task<Version?> GetLatestVersion(CancellationToken cancellationToken = default);

	/// <param name="version">Pass null when you want the latest version.</param>
	string? GetDownloadUrl(Version? version);
}
