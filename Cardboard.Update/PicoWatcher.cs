using Cardboard.Utilities;
using Cranky;

namespace Cardboard.Update;

public static class PicoWatcher
{
	private const string PicoBootloaderLabel = "RPI-RP2";
	private const int DefaultPollIntervalMs = 100;

	/// <summary>
	/// Waits for the Pico bootloader drive to appear
	/// </summary>
	/// <param name="timeout">Maximum time to wait</param>
	/// <param name="cancellationToken">Cancellation token</param>
	/// <returns>DriveInfo for the bootloader drive, or null if not found</returns>
	public static async Task<Result<DriveInfo, WaitForBootloaderDriveError>> WaitForBootloaderDrive(
		TimeSpan timeout,
		CancellationToken cancellationToken = default
	)
	{
		using var timeoutCts = new CancellationTokenSource(timeout);
		using var combinedCts = CancellationTokenSource.CreateLinkedTokenSource(
			cancellationToken,
			timeoutCts.Token
		);
		return await Polling.Poll(
			() => Task.FromResult(FindBootloaderDrive()),
			TimeSpan.FromMilliseconds(DefaultPollIntervalMs),
			combinedCts.Token
		);
	}

	public enum WaitForBootloaderDriveError
	{
		NotFound,
		MultipleDrivesFound,
		Unauthorized,
		IOError,
	}

	/// <summary>
	/// Finds the Pico bootloader drive
	/// </summary>
	public static Result<DriveInfo, WaitForBootloaderDriveError> FindBootloaderDrive()
	{
		try
		{
			var drives = DriveInfo.GetDrives();
			return drives.SingleOrDefault(Predicate) is { } picoDrive
				? picoDrive
				: WaitForBootloaderDriveError.NotFound;
		}
		catch (InvalidOperationException)
		{
			return WaitForBootloaderDriveError.MultipleDrivesFound;
		}
		catch (UnauthorizedAccessException)
		{
			return WaitForBootloaderDriveError.Unauthorized;
		}
		catch (IOException)
		{
			return WaitForBootloaderDriveError.IOError;
		}

		bool Predicate(DriveInfo drive) =>
			drive is { IsReady: true, DriveType: DriveType.Removable }
			&& string.Equals(drive.VolumeLabel, PicoBootloaderLabel, StringComparison.OrdinalIgnoreCase);
	}
}
