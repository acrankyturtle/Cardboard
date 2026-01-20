namespace Cardboard.Update;

public interface IControllerUpdateSource
{
	Task<string?> GetLatestVersion(CancellationToken cancellationToken = default);

	/// <param name="version">Pass null when you want the latest version.</param>
	string? GetDownloadUrl(string? version);
}
