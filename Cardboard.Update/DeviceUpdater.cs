using Cardboard.Device;
using Cardboard.Utilities;
using Cranky;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cardboard.Update;

partial class Services
{
	public static IServiceCollection AddDeviceUpdater(this IServiceCollection services) =>
		services.AddSingleton<IDeviceUpdater, DeviceUpdater>();
}

public interface IDeviceUpdater
{
	/// <summary>
	/// Put a device into bootloader mode, update its firmware, and restore its profile if desired.
	/// Yields progress stages as the update proceeds.
	/// The last element will always be a <see cref="FirmwareUpdateComplete"/>.
	/// </summary>
	/// <remarks>
	/// The <paramref name="cancellationToken"/> is only honored before the device enters bootloader mode.
	/// After that point, the update will run to completion to avoid leaving the device in an undefined state.
	/// </remarks>
	IAsyncEnumerable<FirmwareUpdateReport> UpdateDevice(
		DeviceId deviceId,
		DeviceFirmware firmware,
		bool migrateProfile,
		CancellationToken cancellationToken = default
	);
}

public abstract class FirmwareUpdateReport;

public sealed class FirmwareUpdateProgress : FirmwareUpdateReport
{
	public required FirmwareUpdateStage Stage { get; init; }
}

public sealed class FirmwareUpdateComplete : FirmwareUpdateReport
{
	public required UpdateFirmwareResult Result { get; init; }
}

public enum FirmwareUpdateStage
{
	BackingUpProfile,
	EnteringBootloader,
	WaitingForBootloader,
	WritingFirmware,
	WaitingForReconnect,
	RestoringProfile,
}

public enum UpdateFirmwareResult
{
	Success,
	AlreadyUpToDate,
	DeviceNotFound,
	FirmwareNotFound,
	DeviceTypeMismatch,
	DeviceVariantMismatch,
	DeviceAlreadyInBootloader,
	FailedToGetProfile,
	FailedToRestoreProfile,
	FailedToEnterBootloader,
	FailedToFindBootloader,
	DeviceNotReconnected,
}

internal class DeviceUpdater(IDeviceService deviceService, ILogger<DeviceUpdater> logger) : IDeviceUpdater
{
	private readonly SemaphoreSlim _lock = new(1, 1);

	public async IAsyncEnumerable<FirmwareUpdateReport> UpdateDevice(
		DeviceId deviceId,
		DeviceFirmware firmware,
		bool migrateProfile,
		[System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default
	)
	{
		logger.LogInformation(
			"Starting firmware update for device {DeviceId} to version {Version}",
			deviceId,
			firmware.Version
		);

		DeviceProfile? deviceProfile = null;

		await _lock.WaitAsync(cancellationToken);
		logger.LogDebug("Acquired update lock for device {DeviceId}", deviceId);

		try
		{
			// make sure another device isn't already in bootloader mode
			if (PicoWatcher.FindBootloaderDrive().TryGetSuccess(out var existing))
			{
				logger.LogError(
					"Another device is already in bootloader mode at {Path}",
					existing.RootDirectory.FullName
				);
				yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.DeviceAlreadyInBootloader };
				yield break;
			}

			// find target device
			var devices = await deviceService.GetDevices(cancellationToken);
			var device = devices.FirstOrDefault(d => d.Id == deviceId);

			if (device is null)
			{
				logger.LogError("Device {DeviceId} not found", deviceId);
				yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.DeviceNotFound };
				yield break;
			}

			if (firmware.DeviceType != device.Type)
			{
				logger.LogError(
					"Device type mismatch for {DeviceId}: expected {Expected}, got {Actual}",
					deviceId,
					firmware.DeviceType,
					device.Type
				);
				yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.DeviceTypeMismatch };
				yield break;
			}

			if (firmware.Variant != device.Variant)
			{
				logger.LogError(
					"Device variant mismatch for {DeviceId}: expected {Expected}, got {Actual}",
					deviceId,
					firmware.Variant,
					device.Variant
				);
				yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.DeviceVariantMismatch };
				yield break;
			}

			if (migrateProfile)
			{
				yield return new FirmwareUpdateProgress { Stage = FirmwareUpdateStage.BackingUpProfile };
				logger.LogDebug("Backing up device profile for migration");
				// get profile
				var getProfileResult = await deviceService.SendCommand(
					new GetProfileCommand(),
					new(),
					deviceId,
					cancellationToken
				);
				if (!getProfileResult.TryGetSuccess(out deviceProfile))
				{
					logger.LogError("Failed to get device profile for backup");
					yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.FailedToGetProfile };
					yield break;
				}

				logger.LogDebug("Device profile backed up successfully");
			}

			// Point of no return - from here on, we must complete the update regardless of cancellation
			// to avoid leaving the device in an undefined state (e.g., stuck in bootloader mode)
			cancellationToken.ThrowIfCancellationRequested();

			// put device in bootloader mode
			yield return new FirmwareUpdateProgress { Stage = FirmwareUpdateStage.EnteringBootloader };
			logger.LogDebug("Sending reboot command to enter bootloader mode");
			var bootloaderResult = await deviceService.SendCommand(
				new RebootCommand(),
				new() { BootloaderMode = true },
				deviceId,
				CancellationToken.None
			);
			if (!bootloaderResult.IsSuccess)
			{
				logger.LogError("Failed to send bootloader command");
				yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.FailedToEnterBootloader };
				yield break;
			}

			// wait for device to present itself as USB device
			yield return new FirmwareUpdateProgress { Stage = FirmwareUpdateStage.WaitingForBootloader };
			logger.LogDebug("Waiting for device to appear in bootloader mode");
			var picoResult = await PicoWatcher.WaitForBootloaderDrive(
				TimeSpan.FromSeconds(3),
				CancellationToken.None
			);
			if (!picoResult.TryGet(out var picoDrive, out var error))
			{
				logger.LogError("Failed to find device in bootloader mode: {Error}", error);
				yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.FailedToFindBootloader };
				yield break;
			}

			logger.LogDebug("Found bootloader drive at {Path}", picoDrive.RootDirectory.FullName);

			// copy firmware to device
			yield return new FirmwareUpdateProgress { Stage = FirmwareUpdateStage.WritingFirmware };
			var targetPath = Path.Combine(picoDrive.RootDirectory.FullName, "firmware.uf2");
			logger.LogDebug(
				"Writing {Size} bytes of firmware to {Path}",
				firmware.Firmware.Length,
				targetPath
			);
			await File.WriteAllBytesAsync(targetPath, firmware.Firmware.ToArray(), CancellationToken.None);
			logger.LogDebug("Firmware written successfully, device will reboot");

			// Wait for device to reconnect after firmware update with a timeout
			yield return new FirmwareUpdateProgress { Stage = FirmwareUpdateStage.WaitingForReconnect };
			const int reconnectTimeoutSeconds = 30;
			logger.LogDebug("Waiting up to {Timeout}s for device to reconnect", reconnectTimeoutSeconds);

			using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(reconnectTimeoutSeconds));

			// Poll the device list directly instead of waiting for events
			// This avoids race conditions where the device reconnects before we start listening
			var findAfterReboot = await Polling.Poll<Unit, Unit>(
				async () =>
				{
					var devices = await deviceService.GetDevices(timeoutCts.Token);
					if (devices.Any(x => x.Id == deviceId))
						return Result.Success(Unit.Value);

					return Result.Fail(Unit.Value);
				},
				TimeSpan.FromMilliseconds(500),
				timeoutCts.Token
			);

			if (!findAfterReboot.IsSuccess)
			{
				logger.LogError("Device {DeviceId} did not reconnect after firmware update", deviceId);
				yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.DeviceNotReconnected };
				yield break;
			}

			logger.LogDebug("Device {DeviceId} reconnected successfully", deviceId);

			if (deviceProfile is not null)
			{
				yield return new FirmwareUpdateProgress { Stage = FirmwareUpdateStage.RestoringProfile };
				logger.LogDebug("Restoring device profile after update");
				var restoreProfileResult = await deviceService.SendCommand(
					new UpdateProfileCommand(),
					deviceProfile,
					deviceId,
					CancellationToken.None
				);
				if (!restoreProfileResult.IsSuccess)
				{
					logger.LogError("Failed to restore device profile");
					yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.FailedToRestoreProfile };
					yield break;
				}

				logger.LogDebug("Device profile restored successfully");
			}

			yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.Success };
			logger.LogInformation("Firmware update completed successfully for device {DeviceId}", deviceId);
		}
		finally
		{
			_lock.Release();
			logger.LogDebug("Released update lock for device {DeviceId}", deviceId);
		}
	}

}

public sealed class DeviceFirmware
{
	public required DeviceTypeId DeviceType { get; init; }
	public required uint Version { get; init; }
	public uint? Variant { get; init; }
	public required ReadOnlyMemory<byte> Firmware { get; init; }
}

public class FirmwareUpdateOptions
{
	/// <summary>
	/// Look for a device already in bootloader mode and flash it without performing any other steps.
	/// </summary>
	public bool FlashOnly { get; set; }

	public bool MigrateProfile { get; set; } = true;
}

public class FirmwareIntegrityException(string message) : Exception(message);
