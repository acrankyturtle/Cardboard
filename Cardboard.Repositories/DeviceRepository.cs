using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Device;
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

	Task<bool?> UpdateFirmware(
		DeviceId deviceId,
		uint? version,
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

	public static DeviceSummary From(DeviceInfo deviceInfo, DeviceTypeInfo deviceTypeInfo) =>
		new()
		{
			Id = deviceInfo.Id,
			Name = deviceInfo.Name,
			Model = deviceTypeInfo.Model,
			IconUrl = deviceTypeInfo.IconUrl,
		};
}

public sealed class DeviceDetails
{
	public required DeviceId Id { get; init; }
	public required string Name { get; init; }
	public required DeviceTypeId Type { get; init; }
	public required uint? Variant { get; init; }
	public required string Model { get; init; }
	public string? IconUrl { get; init; }
	public required uint Version { get; init; }
	public required uint? LatestVersion { get; init; }

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
		uint? latestVersion
	) =>
		new()
		{
			Id = info.Id,
			Name = info.Name,
			Type = info.Type,
			Variant = info.Variant,
			Model = typeInfo.Model,
			IconUrl = typeInfo.IconUrl,
			Version = info.Version,
			LatestVersion = latestVersion,
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

public sealed class DeviceTypeInfo
{
	public required DeviceTypeId Id { get; init; }
	public required string Model { get; init; }
	public string? IconUrl { get; init; }
	public IReadOnlyCollection<KeyInfo> KeyMap { get; init; } = [];
}

public sealed class KeyInfo
{
	public required DeviceKeyId KeyId { get; init; }

	public required string Name { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public required KeyOffset Offset { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public required KeySize Size { get; init; }

	public required KeyColor Color { get; init; }
}

public enum KeyColor
{
	Regular,
	Accent1,
	Accent2,
}

public sealed class KeyOffset
{
	[JsonIgnore(Condition = JsonIgnoreCondition.Never)]
	public required int X { get; init; }

	[JsonIgnore(Condition = JsonIgnoreCondition.Never)]
	public required int Y { get; init; }
}

public sealed class KeySize
{
	[JsonIgnore(Condition = JsonIgnoreCondition.Never)]
	public required int Width { get; init; }

	[JsonIgnore(Condition = JsonIgnoreCondition.Never)]
	public required int Height { get; init; }
}

file sealed class DeviceRepository(
	IDeviceService deviceService,
	IFirmwareSource firmwareSource,
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
		var deviceSummaries = devices.Select(x => DeviceSummary.From(x, GetDeviceTypeInfo(x.Type))).ToList();
		return deviceSummaries;
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
		).Match<DeviceStatus?>(
			x => x,
			e =>
			{
				_logger.LogError(
					e,
					"Failed to get status for device {DeviceId}: {Message}",
					deviceId,
					e.Message
				);
				return null;
			}
		);

		if (deviceStatus is null)
		{
			_logger.LogError("Could not get status for {DeviceId}", deviceId);
			return null;
		}

		var deviceTypeInfo = GetDeviceTypeInfo(deviceInfo.Type);
		var latestVersion = await latestVersionTask;
		return DeviceDetails.From(deviceInfo, deviceSettings, deviceStatus, deviceTypeInfo, latestVersion);
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

	public async Task<bool?> UpdateFirmware(
		DeviceId deviceId,
		uint? version,
		CancellationToken cancellationToken = default
	)
	{
		var device = (await deviceService.GetDevices(cancellationToken)).FirstOrDefault(x =>
			x.Id == deviceId
		);
		if (device is null)
			return null;

		if (version is null)
		{
			version = await firmwareSource.GetLatestVersion(device.Type, device.Variant, cancellationToken);
			if (version is null)
				return null;
		}

		if (version <= device.Version)
			return false;

		var firmware = await firmwareSource.GetFirmware(
			device.Type,
			device.Variant,
			version.Value,
			cancellationToken
		);
		if (firmware is null)
			return null;

		Debug.Assert(firmware.Version == version);

		try
		{
			await deviceUpdater.UpdateDevice(deviceId, firmware, true, cancellationToken);
		}
		catch (UpdateDeviceException)
		{
			return false;
		}

		return true;
	}

	private DeviceTypeInfo GetDeviceTypeInfo(DeviceTypeId deviceTypeId) =>
		// TODO: fetch metadata for device -- use fake for now
		_metadata.SingleOrDefault(m => m.Id == deviceTypeId)
		?? new DeviceTypeInfo
		{
			Id = deviceTypeId,
			Model = "???",
			IconUrl = null,
			KeyMap = [],
		};

	// todo: don't hard code
	private readonly IReadOnlyCollection<DeviceTypeInfo> _metadata = new List<DeviceTypeInfo>
	{
		new()
		{
			Id = DeviceTypeId.Parse("0407db48-ca74-5783-9b11-489637b7c615"),
			Model = "CK1-30",
			IconUrl = "/device-icons/ck1-30.svg",
			KeyMap =
			[
				new()
				{
					KeyId = DeviceKeyId.Parse("0661ee85-348b-5d93-b5e2-ac11cfa5344b"),
					Name = "K-1",
					Offset = new() { X = -200, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent1,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("87c4fd79-143b-576b-afa2-bea59e4cd02c"),
					Name = "K-2",
					Offset = new() { X = -100, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("1d652794-96a4-5c59-9948-afd441289317"),
					Name = "K-3",
					Offset = new() { X = 0, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("de57737c-e6c1-5818-bf94-d126ff5304a3"),
					Name = "K-4",
					Offset = new() { X = 100, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("85c20588-8148-5785-9e9f-44976e8dfef8"),
					Name = "K-5",
					Offset = new() { X = 200, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("b6ee974a-b405-5367-8c9f-e70a75045c37"),
					Name = "K-6",
					Offset = new() { X = 300, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent2,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("8a1052be-8165-5976-849b-511ce92f9956"),
					Name = "K-7",
					Offset = new() { X = -200, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("91206d06-70d4-5b75-9fdf-aad7f367fff5"),
					Name = "K-8",
					Offset = new() { X = -100, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7abd3edf-f94c-522e-b2be-06a88bdb1cc9"),
					Name = "K-9",
					Offset = new() { X = 0, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent1,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4"),
					Name = "K-10",
					Offset = new() { X = 100, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("3a801a21-1ef7-5803-bf42-ecd1e8444656"),
					Name = "K-11",
					Offset = new() { X = 200, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("c54ec31f-2381-5636-b0a5-edd448294b88"),
					Name = "K-12",
					Offset = new() { X = 300, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent2,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("16ad3daf-bd00-5168-885a-74008ce8de35"),
					Name = "K-13",
					Offset = new() { X = -200, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("da390fc5-5361-5af9-9398-d3823b81ecba"),
					Name = "K-14",
					Offset = new() { X = -100, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent1,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("1a549b65-43d5-5068-a3f5-59429946e404"),
					Name = "K-15",
					Offset = new() { X = 0, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent1,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("ec06b9a0-0713-5db1-862c-20fafd2b0764"),
					Name = "K-16",
					Offset = new() { X = 100, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent1,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("cbfef260-a498-599f-a6c0-8a6a51002b76"),
					Name = "K-17",
					Offset = new() { X = 200, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("852caff2-9ef9-59a3-ae41-e5eec3fa0d21"),
					Name = "K-18",
					Offset = new() { X = 300, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent2,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("96148043-9890-5767-a464-1b12f126da14"),
					Name = "K-19",
					Offset = new() { X = -200, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13"),
					Name = "K-20",
					Offset = new() { X = -100, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("ab6039e8-38dc-5f91-b15c-6678def87cea"),
					Name = "K-21",
					Offset = new() { X = 0, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("0ef29fa7-07fb-5495-bb6f-33d164eda994"),
					Name = "K-22",
					Offset = new() { X = 100, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("e18caa6c-d922-558e-b146-0262173a28bd"),
					Name = "K-23",
					Offset = new() { X = 200, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7b3285ea-4be6-5eae-9125-cec547fa3fb1"),
					Name = "K-24",
					Offset = new() { X = 300, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Accent2,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("4ade2cba-18d3-5fd0-a6d4-ba928bb47009"),
					Name = "K-25",
					Offset = new() { X = -200, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("474d0b39-6165-58e0-9745-2ca79493a9e8"),
					Name = "K-26",
					Offset = new() { X = -100, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0"),
					Name = "K-27",
					Offset = new() { X = 0, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("00a68179-7585-5f08-89fd-c63464760575"),
					Name = "K-28",
					Offset = new() { X = 100, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7b743c81-7260-5ae3-8c7e-fc451751a2c7"),
					Name = "K-29",
					Offset = new() { X = 200, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("15c56a3d-0f31-5ebd-bcf1-63aa968be49a"),
					Name = "K-30",
					Offset = new() { X = 300, Y = 350 },
					Size = new() { Width = 100, Height = 200 },
					Color = KeyColor.Accent1,
				},
			],
		},
		new()
		{
			Id = DeviceTypeId.Parse("c415be22-6662-4fb3-a4a1-0c40845a9075"),
			Model = "Turdboard",
			IconUrl = null,
			KeyMap =
			[
				new()
				{
					KeyId = DeviceKeyId.Parse("0661ee85-348b-5d93-b5e2-ac11cfa5344b"),
					Name = "K-1",
					Offset = new() { X = -200, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("87c4fd79-143b-576b-afa2-bea59e4cd02c"),
					Name = "K-2",
					Offset = new() { X = -100, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("1d652794-96a4-5c59-9948-afd441289317"),
					Name = "K-3",
					Offset = new() { X = 0, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("de57737c-e6c1-5818-bf94-d126ff5304a3"),
					Name = "K-4",
					Offset = new() { X = 100, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("85c20588-8148-5785-9e9f-44976e8dfef8"),
					Name = "K-5",
					Offset = new() { X = 200, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("b6ee974a-b405-5367-8c9f-e70a75045c37"),
					Name = "K-6",
					Offset = new() { X = 300, Y = -100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("8a1052be-8165-5976-849b-511ce92f9956"),
					Name = "K-7",
					Offset = new() { X = -200, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("91206d06-70d4-5b75-9fdf-aad7f367fff5"),
					Name = "K-8",
					Offset = new() { X = -100, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7abd3edf-f94c-522e-b2be-06a88bdb1cc9"),
					Name = "K-9",
					Offset = new() { X = 0, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4"),
					Name = "K-10",
					Offset = new() { X = 100, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("3a801a21-1ef7-5803-bf42-ecd1e8444656"),
					Name = "K-11",
					Offset = new() { X = 200, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("c54ec31f-2381-5636-b0a5-edd448294b88"),
					Name = "K-12",
					Offset = new() { X = 300, Y = 0 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("16ad3daf-bd00-5168-885a-74008ce8de35"),
					Name = "K-13",
					Offset = new() { X = -200, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("da390fc5-5361-5af9-9398-d3823b81ecba"),
					Name = "K-14",
					Offset = new() { X = -100, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("1a549b65-43d5-5068-a3f5-59429946e404"),
					Name = "K-15",
					Offset = new() { X = 0, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("ec06b9a0-0713-5db1-862c-20fafd2b0764"),
					Name = "K-16",
					Offset = new() { X = 100, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("cbfef260-a498-599f-a6c0-8a6a51002b76"),
					Name = "K-17",
					Offset = new() { X = 200, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("852caff2-9ef9-59a3-ae41-e5eec3fa0d21"),
					Name = "K-18",
					Offset = new() { X = 300, Y = 100 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("96148043-9890-5767-a464-1b12f126da14"),
					Name = "K-19",
					Offset = new() { X = -200, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13"),
					Name = "K-20",
					Offset = new() { X = -100, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("ab6039e8-38dc-5f91-b15c-6678def87cea"),
					Name = "K-21",
					Offset = new() { X = 0, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("0ef29fa7-07fb-5495-bb6f-33d164eda994"),
					Name = "K-22",
					Offset = new() { X = 100, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("e18caa6c-d922-558e-b146-0262173a28bd"),
					Name = "K-23",
					Offset = new() { X = 200, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7b3285ea-4be6-5eae-9125-cec547fa3fb1"),
					Name = "K-24",
					Offset = new() { X = 300, Y = 200 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("4ade2cba-18d3-5fd0-a6d4-ba928bb47009"),
					Name = "K-25",
					Offset = new() { X = -200, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("474d0b39-6165-58e0-9745-2ca79493a9e8"),
					Name = "K-26",
					Offset = new() { X = -100, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0"),
					Name = "K-27",
					Offset = new() { X = 0, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("00a68179-7585-5f08-89fd-c63464760575"),
					Name = "K-28",
					Offset = new() { X = 100, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7b743c81-7260-5ae3-8c7e-fc451751a2c7"),
					Name = "K-29",
					Offset = new() { X = 200, Y = 300 },
					Size = new() { Width = 100, Height = 100 },
					Color = KeyColor.Regular,
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("15c56a3d-0f31-5ebd-bcf1-63aa968be49a"),
					Name = "K-30",
					Offset = new() { X = 300, Y = 350 },
					Size = new() { Width = 100, Height = 200 },
					Color = KeyColor.Regular,
				},
			],
		},
	};
}

partial class Services
{
	private static IServiceCollection AddDeviceRepository(this IServiceCollection services) =>
		services.AddSingleton<IDeviceRepository, DeviceRepository>();
}
