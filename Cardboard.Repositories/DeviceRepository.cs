using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Cardboard.Device;
using Cardboard.Metadata;
using Cardboard.Update;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cardboard.Repositories;

public interface IDeviceRepository
{
	Task<IReadOnlyCollection<DeviceSummary>> GetDevices(CancellationToken cancellationToken = default);

	Task<DeviceDetails?> GetDeviceDetails(DeviceId deviceId, CancellationToken cancellationToken = default);
	Task<Profile?> GetDeviceProfile(DeviceId deviceId, CancellationToken cancellationToken = default);

	Task<UpdateDeviceProfileResult> UpdateDeviceProfile(
		DeviceId deviceId,
		Profile deviceProfile,
		CancellationToken cancellationToken = default
	);

	Task<bool> EnterBootloader(DeviceId deviceId, CancellationToken cancellationToken = default);

	Task<DeviceSettings?> GetDeviceSettings(DeviceId deviceId, CancellationToken cancellationToken = default);

	Task<UpdateDeviceSettingsResult> UpdateDeviceSettings(
		DeviceId deviceId,
		DeviceSettings deviceSettings,
		CancellationToken cancellationToken = default
	);

	IAsyncEnumerable<FirmwareUpdateReport> UpdateFirmware(
		DeviceId deviceId,
		Version? version,
		bool migrateData,
		CancellationToken cancellationToken = default
	);
}

public enum UpdateDeviceProfileResult
{
	Success,
	NotFound,
	ProfileError,
	DeviceError,
}

public enum UpdateDeviceSettingsResult
{
	Success,
	NotFound,
	DeviceError,
}

public sealed class DeviceSummary
{
	public required DeviceId Id { get; init; }
	public required string Name { get; init; }
	public required string Model { get; init; }
	public string? IconUrl { get; init; }

	public static DeviceSummary From(
		DeviceInfo deviceInfo,
		DeviceTypeInfo deviceTypeInfo,
		DeviceProfile profile
	) =>
		new()
		{
			Id = deviceInfo.Id,
			Name = profile.Name,
			Model = deviceTypeInfo.Model,
			IconUrl = deviceTypeInfo.IconUrl,
		};
}

public sealed class DeviceDetails
{
	public required DeviceId Id { get; init; }
	public required string Name { get; init; }
	public required DeviceTypeId Type { get; init; }
	public required string? Variant { get; init; }
	public required string Model { get; init; }
	public string? IconUrl { get; init; }
	public required Version Version { get; init; }
	public required Version? LatestVersion { get; init; }
	public required bool UpdateAvailable { get; init; }

	public required DeviceSettingsReport Settings { get; init; }

	public required DeviceStatusReport Status { get; init; }

	public required IReadOnlyCollection<CommandInfo> Commands { get; init; }

	public IReadOnlyCollection<KeyInfo> KeyMap { get; init; } = [];

	public int VirtualKeyCount { get; init; }

	public static DeviceDetails From(
		DeviceInfo info,
		DeviceSettings settings,
		DeviceStatus status,
		DeviceTypeInfo typeInfo,
		Version? latestVersion,
		string profileName
	) =>
		new()
		{
			Id = info.Id,
			Name = profileName,
			Type = info.Type,
			Variant = info.Variant,
			Model = typeInfo.Model,
			IconUrl = typeInfo.IconUrl,
			Version = info.Version,
			LatestVersion = latestVersion,
			UpdateAvailable = latestVersion is not null && latestVersion > info.Version,
			Settings = new() { IsMouseEnabled = settings.MouseEnabled },
			Status = DeviceStatusReport.From(status),
			Commands = info.Commands,
			KeyMap = typeInfo.KeyMap,
			VirtualKeyCount = VirtualKeyHelper.GetVirtualKeyCount(info),
		};
}

public sealed class DeviceSettingsReport
{
	public required bool IsMouseEnabled { get; init; }
}

public sealed class DeviceStatusReport
{
	public required ulong Tick { get; init; }
	public required ulong Allocated { get; init; }
	public required ulong AllocatorSize { get; init; }
	public required IReadOnlyCollection<DeviceStatusError> Errors { get; init; }

	public static DeviceStatusReport From(DeviceStatus status)
	{
		var errors = status.Errors.Select(e => DeviceStatusError.From(e, status.Now)).ToList();
		return new()
		{
			Tick = status.Now,
			Allocated = status.AllocatorCurrent,
			AllocatorSize = status.AllocatorMax,
			Errors = errors,
		};
	}
}

public sealed class DeviceStatusError
{
	public required string Timestamp { get; init; }
	public required string Message { get; init; }

	public static DeviceStatusError From(DeviceError error, ulong tick)
	{
		Debug.Assert(tick >= error.Timestamp);
		var dt = tick - error.Timestamp;

		var timestamp = DateTime.Now - TimeSpan.FromMicroseconds(dt);
		return new() { Timestamp = timestamp.ToString(CultureInfo.CurrentCulture), Message = error.Message };
	}
}

file sealed class DeviceRepository(
	IDeviceService deviceService,
	IFirmwareSource firmwareSource,
	IMetadataSource metadataSource,
	IDeviceUpdater deviceUpdater,
	ILogger<DeviceRepository> _logger,
	JsonSerializerOptions serializerOptions
) : IDeviceRepository
{
	public async Task<IReadOnlyCollection<DeviceSummary>> GetDevices(
		CancellationToken cancellationToken = default
	)
	{
		var devices = await deviceService.GetDevices(cancellationToken);

		var summaries = new List<DeviceSummary>();
		foreach (var device in devices)
		{
			var profileResult = await deviceService.SendCommand(
				new GetProfileCommand(),
				new(),
				device.Id,
				cancellationToken
			);

			if (!profileResult.TryGetSuccess(out var profile))
			{
				_logger.LogError(
					"Could not get profile for {DeviceId}, omitting from device list",
					device.Id
				);
				continue;
			}

			var deviceTypeInfo = await GetDeviceTypeInfo(device.Type, device.Variant, cancellationToken);
			summaries.Add(DeviceSummary.From(device, deviceTypeInfo, profile));
		}

		return summaries;
	}

	public async Task<DeviceDetails?> GetDeviceDetails(
		DeviceId deviceId,
		CancellationToken cancellationToken = default
	)
	{
		var devices = await deviceService.GetDevices(cancellationToken);
		var deviceInfo = devices.SingleOrDefault(x => x.Id == deviceId);

		if (deviceInfo is null)
			return null;

		var latestVersionTask = firmwareSource.GetLatestVersion(
			deviceInfo.Type,
			deviceInfo.Variant,
			cancellationToken
		);

		var deviceSettings = (
			await deviceService.SendCommand(new GetSettingsCommand(), new(), deviceId, cancellationToken)
		).TryGetSuccess(out var settings)
			? settings
			: null;

		if (deviceSettings is null)
		{
			_logger.LogError("Could not get settings for {DeviceId}", deviceId);
			return null;
		}

		var deviceStatus = (
			await deviceService.SendCommand(new GetStatusCommand(), new(), deviceId, cancellationToken)
		).TryGetSuccess(out var status)
			? status
			: null;

		if (deviceStatus is null)
		{
			_logger.LogError("Could not get status for {DeviceId}", deviceId);
			return null;
		}

		var deviceProfile = (
			await deviceService.SendCommand(new GetProfileCommand(), new(), deviceId, cancellationToken)
		).TryGetSuccess(out var profile)
			? profile
			: null;

		if (deviceProfile is null)
		{
			_logger.LogError("Could not get profile for {DeviceId}", deviceId);
			return null;
		}

		var deviceTypeInfo = await GetDeviceTypeInfo(deviceInfo.Type, deviceInfo.Variant, cancellationToken);
		var latestVersion = await latestVersionTask;
		return DeviceDetails.From(
			deviceInfo,
			deviceSettings,
			deviceStatus,
			deviceTypeInfo,
			latestVersion,
			deviceProfile.Name
		);
	}

	public async Task<Profile?> GetDeviceProfile(
		DeviceId deviceId,
		CancellationToken cancellationToken = default
	)
	{
		var result = await deviceService.SendCommand(
			new GetProfileCommand(),
			new(),
			deviceId,
			cancellationToken
		);
		return result.Match<Profile?>(Profile.FromDevice, _ => null);
	}

	public async Task<UpdateDeviceProfileResult> UpdateDeviceProfile(
		DeviceId deviceId,
		Profile profile,
		CancellationToken cancellationToken = default
	)
	{
		var deviceProfile = profile.ToDevice();

		var previous = (await GetDeviceProfile(deviceId, cancellationToken))?.ToDevice();
		if (previous is null)
			return UpdateDeviceProfileResult.NotFound;

		var result = await deviceService.SendCommand(
			new UpdateProfileCommand(),
			deviceProfile,
			deviceId,
			cancellationToken
		);

		if (result.IsSuccess)
			return UpdateDeviceProfileResult.Success;

		// try to restore the previous profile
		var restoreResults = await deviceService.SendCommand(
			new UpdateProfileCommand(),
			previous,
			d => d.Id == deviceId,
			cancellationToken
		);

		if (restoreResults.Count == 0 || !restoreResults.Single().Result.IsSuccess)
		{
			_logger.LogWarning(
				"Failed to restore device profile for {DeviceId} after failed update",
				deviceId
			);
		}

		return UpdateDeviceProfileResult.DeviceError;
	}

	public async Task<bool> EnterBootloader(DeviceId deviceId, CancellationToken cancellationToken = default)
	{
		var result = (
			await deviceService.SendCommand(
				new RebootCommand(),
				new() { BootloaderMode = true },
				d => d.Id == deviceId,
				cancellationToken
			)
		)
			.Select(x => x.Result.TryGetError(out var exception) ? exception : null)
			.SingleOrDefault();

		if (result is not null)
		{
			_logger.LogError(
				result,
				"Failed to enter bootloader for device {DeviceId}: {Message}",
				deviceId,
				result.Message
			);
			return false;
		}

		return true;
	}

	public async Task<DeviceSettings?> GetDeviceSettings(
		DeviceId deviceId,
		CancellationToken cancellationToken = default
	)
	{
		var result = await deviceService.SendCommand(
			new GetSettingsCommand(),
			new(),
			deviceId,
			cancellationToken
		);
		return result.TryGetSuccess(out var success) ? success : null;
	}

	public async Task<UpdateDeviceSettingsResult> UpdateDeviceSettings(
		DeviceId deviceId,
		DeviceSettings deviceSettings,
		CancellationToken cancellationToken = default
	)
	{
		var previous = await GetDeviceSettings(deviceId, cancellationToken);
		if (previous is null)
			return UpdateDeviceSettingsResult.NotFound;

		var result = await deviceService.SendCommand(
			new UpdateSettingsCommand(),
			deviceSettings,
			deviceId,
			cancellationToken
		);

		if (result.IsSuccess)
			return UpdateDeviceSettingsResult.Success;

		// try to restore the previous settings
		var restoreResults = await deviceService.SendCommand(
			new UpdateSettingsCommand(),
			previous,
			d => d.Id == deviceId,
			cancellationToken
		);

		if (restoreResults.Count == 0 || !restoreResults.Single().Result.IsSuccess)
		{
			_logger.LogWarning(
				"Failed to restore device settings for {DeviceId} after failed update",
				deviceId
			);
		}

		return UpdateDeviceSettingsResult.DeviceError;
	}

	public async IAsyncEnumerable<FirmwareUpdateReport> UpdateFirmware(
		DeviceId deviceId,
		Version? version,
		bool migrateData,
		[System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default
	)
	{
		var device = (await deviceService.GetDevices(cancellationToken)).FirstOrDefault(x =>
			x.Id == deviceId
		);
		if (device is null)
		{
			yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.DeviceNotFound };
			yield break;
		}

		if (version is null)
		{
			version = await firmwareSource.GetLatestVersion(device.Type, device.Variant, cancellationToken);
			if (version is null)
			{
				yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.FirmwareNotFound };
				yield break;
			}
		}

		if (version <= device.Version)
		{
			yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.AlreadyUpToDate };
			yield break;
		}

		var firmware = await firmwareSource.GetFirmware(
			device.Type,
			device.Variant,
			version,
			cancellationToken
		);
		if (firmware is null)
		{
			yield return new FirmwareUpdateComplete { Result = UpdateFirmwareResult.FirmwareNotFound };
			yield break;
		}

		Debug.Assert(firmware.Version == version);

		await foreach (
			var report in deviceUpdater.UpdateDevice(deviceId, firmware, migrateData, cancellationToken)
		)
		{
			yield return report;
		}
	}

	private async Task<DeviceTypeInfo> GetDeviceTypeInfo(
		DeviceTypeId deviceTypeId,
		string? variant,
		CancellationToken cancellationToken
	)
	{
		var metadata = await metadataSource.GetMetadata(deviceTypeId, cancellationToken);
		return metadata is not null
			? DeviceTypeInfo.From(metadata, variant)
			: new()
			{
				Id = deviceTypeId,
				Variant = null,
				Model = "???",
				IconUrl = null,
				KeyMap = [],
			};
	}
}

partial class Services
{
	private static IServiceCollection AddDeviceRepository(this IServiceCollection services) =>
		services.AddSingleton<IDeviceRepository, DeviceRepository>();
}
