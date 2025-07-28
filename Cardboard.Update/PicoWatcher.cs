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
	public static async Task<DriveInfo?> WaitForBootloaderDriveAsync(
		TimeSpan timeout,
		CancellationToken cancellationToken = default
	)
	{
		using var timeoutCts = new CancellationTokenSource(timeout);
		using var combinedCts = CancellationTokenSource.CreateLinkedTokenSource(
			cancellationToken,
			timeoutCts.Token
		);

		try
		{
			while (!combinedCts.Token.IsCancellationRequested)
			{
				var picoDrive = FindBootloaderDrive();
				if (picoDrive != null)
					return picoDrive;

				await Task.Delay(TimeSpan.FromMilliseconds(DefaultPollIntervalMs), combinedCts.Token);
			}
		}
		catch (TaskCanceledException)
		{
			return null;
		}

		return null;
	}

	/// <summary>
	/// Finds the Pico bootloader drive
	/// </summary>
	private static DriveInfo? FindBootloaderDrive()
	{
		try
		{
			var drives = DriveInfo.GetDrives();
			return drives.FirstOrDefault(drive =>
				drive.IsReady
				&& drive.DriveType == DriveType.Removable
				&& string.Equals(drive.VolumeLabel, PicoBootloaderLabel, StringComparison.OrdinalIgnoreCase)
			);
		}
		catch (Exception)
		{
			// Handle cases where drives might be temporarily inaccessible
			return null;
		}
	}
}
