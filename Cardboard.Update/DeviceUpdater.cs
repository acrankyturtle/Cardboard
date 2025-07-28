using System.Reactive.Linq;
using Cardboard.Device;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Update;

public static class Services
{
	public static IServiceCollection AddUpdateService(this IServiceCollection services) =>
		services.AddSingleton<IDeviceUpdater, DeviceUpdate>();
}

public interface IDeviceUpdater
{
	/// <exception cref="UpdateDeviceException"></exception>
	Task UpdateDeviceAsync(
		DeviceId deviceId,
		DeviceFirmware firmware,
		UpdateOptions? options = null,
		CancellationToken cancellationToken = default
	);
}

public abstract class UpdateDeviceException(string message) : Exception(message);

internal class DeviceUpdate(IDeviceService deviceService) : IDeviceUpdater
{
	public async Task UpdateDeviceAsync(
		DeviceId deviceId,
		DeviceFirmware firmware,
		UpdateOptions? options = null,
		CancellationToken cancellationToken = default
	)
	{
		options ??= new();

		DeviceProfile? deviceProfile = null;

		if (!options.FlashOnly)
		{
			// find target device
			var devices = await deviceService.GetDevices(cancellationToken);
			var device = devices.FirstOrDefault(d => d.Id == deviceId);

			if (device is null)
				throw new DeviceNotFoundException(deviceId);

			if (firmware.DeviceType != device.Type)
				throw new DeviceTypeMismatchException(deviceId, firmware.DeviceType, device.Type);

			// get profile
			if (options.MigrateProfile)
			{
				var getProfileResult = await deviceService.SendCommand(
					new GetProfileCommand(),
					new(),
					deviceId,
					cancellationToken
				);
				if (!getProfileResult.TryGetSuccess(out deviceProfile))
					throw new FailedToGetDeviceProfileException();
			}

			// put device in bootloader mode
			var bootloaderResult = await deviceService.SendCommand(
				new EnterBootloaderCommand(),
				new(),
				deviceId,
				cancellationToken
			);
			if (!bootloaderResult.IsSuccess)
				throw new FailedToSendBootloaderCommandException();
		}

		// wait for device to present itself as USB device
		var picoDrive = await PicoWatcher.WaitForBootloaderDriveAsync(
			TimeSpan.FromSeconds(3),
			cancellationToken
		);
		if (picoDrive is null)
			throw new FailedToFindPicoInBootloaderException();

		// copy firmware to device
		var targetPath = Path.Combine(picoDrive.RootDirectory.FullName, "firmware.uf2");
		await File.WriteAllBytesAsync(targetPath, firmware.Firmware, cancellationToken);

		while (true)
		{
			var deviceChanged = await deviceService.OnDevicesChanged;
			if (deviceChanged.Added.Any(x => x.Id == deviceId))
				break;

			// todo: throw after a timeout?
		}

		if (!options.FlashOnly && deviceProfile is not null)
		{
			var restoreProfileResult = await deviceService.SendCommand(
				new ChangeProfileCommand(),
				deviceProfile,
				deviceId,
				cancellationToken
			);
			if (!restoreProfileResult.IsSuccess)
				throw new FailedToRestoreDeviceProfileException();
		}
	}
}

public class DeviceFirmware
{
	public required DeviceTypeId DeviceType { get; set; }
	public required uint Version { get; set; }
	public required ReadOnlyMemory<byte> Firmware { get; set; }
}

public class UpdateOptions
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

public class FailedToGetDeviceProfileException() : UpdateDeviceException("Failed to get device profile.");

public class FailedToRestoreDeviceProfileException()
	: UpdateDeviceException("Failed to restore device profile.");

public class FailedToSendBootloaderCommandException()
	: UpdateDeviceException("Failed to send bootloader command to device.");

public class FailedToFindPicoInBootloaderException()
	: UpdateDeviceException("Failed to find a Pico device in bootloader mode.");
