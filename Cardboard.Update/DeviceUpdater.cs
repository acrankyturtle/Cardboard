using System.Reactive.Threading.Tasks;
using Cardboard.Device;
using Cardboard.Utilities;
using Cranky;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cardboard.Update;

partial class Services
{
	public static IServiceCollection AddDeviceUpdater(this IServiceCollection services) =>
		services.AddSingleton<IDeviceUpdater, DeviceUpdate>();
}

public interface IDeviceUpdater
{
	/// <exception cref="UpdateDeviceException"></exception>
	Task UpdateDevice(
		DeviceId deviceId,
		DeviceFirmware firmware,
		bool migrateProfile,
		CancellationToken cancellationToken = default
	);

	/// <exception cref="UpdateDeviceException"></exception>
	Task UpdateDevice(DeviceFirmware firmware, CancellationToken cancellationToken = default);
}

public abstract class UpdateDeviceException(string message) : Exception(message);

internal class DeviceUpdate(IDeviceService deviceService, ILogger<DeviceUpdate> logger) : IDeviceUpdater
{
	private readonly SemaphoreSlim _lock = new(1, 1);

	public async Task UpdateDevice(
		DeviceId deviceId,
		DeviceFirmware firmware,
		bool migrateProfile,
		CancellationToken cancellationToken = default
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
				logger.LogError("Another device is already in bootloader mode at {Path}", existing.RootDirectory.FullName);
				throw new DeviceAlreadyInBootloaderModeException(existing.RootDirectory.FullName);
			}

			// find target device
			var devices = await deviceService.GetDevices(cancellationToken);
			var device = devices.FirstOrDefault(d => d.Id == deviceId);

			if (device is null)
			{
				logger.LogError("Device {DeviceId} not found", deviceId);
				throw new DeviceNotFoundException(deviceId);
			}

			if (firmware.DeviceType != device.Type)
			{
				logger.LogError(
					"Device type mismatch for {DeviceId}: expected {Expected}, got {Actual}",
					deviceId,
					firmware.DeviceType,
					device.Type
				);
				throw new DeviceTypeMismatchException(deviceId, firmware.DeviceType, device.Type);
			}

			if (migrateProfile)
			{
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
					throw new FailedToGetDeviceProfileException();
				}
				logger.LogDebug("Device profile backed up successfully");
			}

			// put device in bootloader mode
			logger.LogDebug("Sending reboot command to enter bootloader mode");
			var bootloaderResult = await deviceService.SendCommand(
				new RebootCommand(),
				new() { BootloaderMode = true },
				deviceId,
				cancellationToken
			);
			if (!bootloaderResult.IsSuccess)
			{
				logger.LogError("Failed to send bootloader command");
				throw new FailedToSendBootloaderCommandException();
			}

			// update pico in bootloader mode
			await UpdateDevice(firmware, cancellationToken);

			// Wait for device to reconnect after firmware update with a timeout
			const int reconnectTimeoutSeconds = 30;
			logger.LogDebug("Waiting up to {Timeout}s for device to reconnect", reconnectTimeoutSeconds);

			using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(reconnectTimeoutSeconds));
			using var combinedCts = CancellationTokenSource.CreateLinkedTokenSource(
				cancellationToken,
				timeoutCts.Token
			);

			var findAfterReboot = await Polling.Poll<Unit, Unit>(
				async () =>
				{
					var deviceChanged = await deviceService.OnDevicesChanged.ToTask(combinedCts.Token);
					if (deviceChanged.Added.Any(x => x.Id == deviceId))
						return Result.Fail(Unit.Value);

					return Result.Success(Unit.Value);
				},
				TimeSpan.FromMilliseconds(100),
				combinedCts.Token
			);

			if (!findAfterReboot.IsSuccess)
			{
				logger.LogError("Device {DeviceId} did not reconnect after firmware update", deviceId);
				throw new FailedToFindDeviceAfterUpdateException();
			}

			logger.LogDebug("Device {DeviceId} reconnected successfully", deviceId);

			if (deviceProfile is not null)
			{
				logger.LogDebug("Restoring device profile after update");
				var restoreProfileResult = await deviceService.SendCommand(
					new UpdateProfileCommand(),
					deviceProfile,
					deviceId,
					cancellationToken
				);
				if (!restoreProfileResult.IsSuccess)
				{
					logger.LogError("Failed to restore device profile");
					throw new FailedToRestoreDeviceProfileException();
				}
				logger.LogDebug("Device profile restored successfully");
			}

			logger.LogInformation(
				"Firmware update completed successfully for device {DeviceId}",
				deviceId
			);
		}
		finally
		{
			_lock.Release();
			logger.LogDebug("Released update lock for device {DeviceId}", deviceId);
		}
	}

	public async Task UpdateDevice(DeviceFirmware firmware, CancellationToken cancellationToken = default)
	{
		logger.LogDebug("Waiting for device to appear in bootloader mode");

		// wait for device to present itself as USB device
		var result = await PicoWatcher.WaitForBootloaderDrive(TimeSpan.FromSeconds(3), cancellationToken);
		if (!result.TryGet(out var picoDrive, out var error))
		{
			logger.LogError("Failed to find device in bootloader mode: {Error}", error);
			throw new FailedToFindPicoInBootloaderException(error);
		}

		logger.LogDebug("Found bootloader drive at {Path}", picoDrive.RootDirectory.FullName);

		// copy firmware to device
		var targetPath = Path.Combine(picoDrive.RootDirectory.FullName, "firmware.uf2");
		logger.LogDebug("Writing {Size} bytes of firmware to {Path}", firmware.Firmware.Length, targetPath);

		await File.WriteAllBytesAsync(targetPath, firmware.Firmware, cancellationToken);

		logger.LogDebug("Firmware written successfully, device will reboot");
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

public class DeviceNotFoundException(DeviceId deviceId)
	: UpdateDeviceException($"Device with ID {deviceId} not found.");

public class DeviceTypeMismatchException(
	DeviceId deviceId,
	DeviceTypeId expectedType,
	DeviceTypeId actualType
)
	: UpdateDeviceException(
		$"Device type mismatch for device {deviceId}: expected {expectedType}, but found {actualType}."
	);

public class DeviceAlreadyInBootloaderModeException(string path)
	: UpdateDeviceException($"Another device is already in bootloader mode at `{path}`.");

public class FailedToGetDeviceProfileException() : UpdateDeviceException("Failed to get device profile.");

public class FailedToRestoreDeviceProfileException()
	: UpdateDeviceException("Failed to restore device profile.");

public class FailedToSendBootloaderCommandException()
	: UpdateDeviceException("Failed to send bootloader command to device.");

public class FailedToFindPicoInBootloaderException(PicoWatcher.WaitForBootloaderDriveError error)
	: UpdateDeviceException($"Failed to find a Pico device in bootloader mode: {error}.");

public class FailedToFindDeviceAfterUpdateException()
	: UpdateDeviceException("Failed to find device after updating firmware.");

public class FirmwareIntegrityException(string message) : Exception(message);
