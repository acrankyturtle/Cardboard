using System.Drawing;
using Cardboard.Device;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Cardboard.Repositories;

public interface IDeviceRepository
{
	Task<IReadOnlyCollection<DeviceSummary>> GetDevices(CancellationToken cancellationToken = default);

	Task<DeviceDetails?> GetDeviceDetails(DeviceId deviceId, CancellationToken cancellationToken = default);
	Task<DeviceProfile?> GetDeviceProfile(DeviceId deviceId, CancellationToken cancellationToken = default);

	Task<UpdateDeviceProfileResult> UpdateDeviceProfile(
		DeviceId deviceId,
		DeviceProfile deviceProfile,
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
	public required string Model { get; init; }
	public string? IconUrl { get; init; }

	public required IReadOnlyCollection<CommandInfo> Commands { get; init; }

	public IReadOnlyCollection<KeyInfo> KeyMap { get; init; } = [];

	public static DeviceDetails From(DeviceInfo deviceInfo, DeviceTypeInfo deviceTypeInfo) =>
		new()
		{
			Id = deviceInfo.Id,
			Name = deviceInfo.Name,
			Type = deviceInfo.Type,
			Model = deviceTypeInfo.Model,
			IconUrl = deviceTypeInfo.IconUrl,
			Commands = deviceInfo.Commands,
			KeyMap = deviceTypeInfo.KeyMap,
		};
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
	public DeviceKeyId KeyId { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public Point Offset { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public Size Size { get; init; }
}

internal sealed class DeviceRepository(IDeviceService deviceService, ILogger<DeviceRepository> _logger)
	: IDeviceRepository
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

		var deviceTypeInfo = GetDeviceTypeInfo(deviceInfo.Type);
		return DeviceDetails.From(deviceInfo, deviceTypeInfo);
	}

	public async Task<DeviceProfile?> GetDeviceProfile(
		DeviceId deviceId,
		CancellationToken cancellationToken = default
	)
	{
		var results = await deviceService.SendCommand(
			new GetProfileCommand(),
			new(),
			d => d.Id == deviceId,
			cancellationToken
		);

		return results.Count > 0 ? results.Single().Result.Match<DeviceProfile?>(p => p, _ => null) : null;
	}

	public async Task<UpdateDeviceProfileResult> UpdateDeviceProfile(
		DeviceId deviceId,
		DeviceProfile deviceProfile,
		CancellationToken cancellationToken = default
	)
	{
		var previous = await GetDeviceProfile(deviceId, cancellationToken);
		if (previous is null)
			return UpdateDeviceProfileResult.NotFound;

		var results = await deviceService.SendCommand(
			new ChangeProfileCommand(),
			deviceProfile,
			d => d.Id == deviceId,
			cancellationToken
		);

		if (results.Count < 1)
			return UpdateDeviceProfileResult.NotFound;

		if (!results.Single().Result.IsSuccess)
		{
			// try to restore the previous profile
			// var restoreResults = await deviceService.SendCommand(
			// 	new ChangeProfileCommand(),
			// 	previous,
			// 	d => d.Id == deviceId,
			// 	cancellationToken
			// );

			// if (restoreResults.Count == 0 || !restoreResults.Single().Result.IsSuccess)
			{
				_logger.LogWarning(
					"Failed to restore device profile for {DeviceId} after failed update",
					deviceId
				);
			}

			return UpdateDeviceProfileResult.DeviceError;
		}

		return UpdateDeviceProfileResult.Success;
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
					Offset = new(-200, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("87c4fd79-143b-576b-afa2-bea59e4cd02c"),
					Offset = new(-100, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("1d652794-96a4-5c59-9948-afd441289317"),
					Offset = new(0, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("de57737c-e6c1-5818-bf94-d126ff5304a3"),
					Offset = new(100, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("85c20588-8148-5785-9e9f-44976e8dfef8"),
					Offset = new(200, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("b6ee974a-b405-5367-8c9f-e70a75045c37"),
					Offset = new(300, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("8a1052be-8165-5976-849b-511ce92f9956"),
					Offset = new(-200, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("91206d06-70d4-5b75-9fdf-aad7f367fff5"),
					Offset = new(-100, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7abd3edf-f94c-522e-b2be-06a88bdb1cc9"),
					Offset = new(0, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4"),
					Offset = new(100, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("3a801a21-1ef7-5803-bf42-ecd1e8444656"),
					Offset = new(200, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("c54ec31f-2381-5636-b0a5-edd448294b88"),
					Offset = new(300, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("16ad3daf-bd00-5168-885a-74008ce8de35"),
					Offset = new(-200, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("da390fc5-5361-5af9-9398-d3823b81ecba"),
					Offset = new(-100, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("1a549b65-43d5-5068-a3f5-59429946e404"),
					Offset = new(0, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("ec06b9a0-0713-5db1-862c-20fafd2b0764"),
					Offset = new(100, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("cbfef260-a498-599f-a6c0-8a6a51002b76"),
					Offset = new(200, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("852caff2-9ef9-59a3-ae41-e5eec3fa0d21"),
					Offset = new(300, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("96148043-9890-5767-a464-1b12f126da14"),
					Offset = new(-200, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13"),
					Offset = new(-100, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("ab6039e8-38dc-5f91-b15c-6678def87cea"),
					Offset = new(0, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("0ef29fa7-07fb-5495-bb6f-33d164eda994"),
					Offset = new(100, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("e18caa6c-d922-558e-b146-0262173a28bd"),
					Offset = new(200, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7b3285ea-4be6-5eae-9125-cec547fa3fb1"),
					Offset = new(300, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("4ade2cba-18d3-5fd0-a6d4-ba928bb47009"),
					Offset = new(-200, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("474d0b39-6165-58e0-9745-2ca79493a9e8"),
					Offset = new(-100, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0"),
					Offset = new(0, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("00a68179-7585-5f08-89fd-c63464760575"),
					Offset = new(100, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7b743c81-7260-5ae3-8c7e-fc451751a2c7"),
					Offset = new(200, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("15c56a3d-0f31-5ebd-bcf1-63aa968be49a"),
					Offset = new(300, 350),
					Size = new(100, 200),
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
					Offset = new(-200, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("87c4fd79-143b-576b-afa2-bea59e4cd02c"),
					Offset = new(-100, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("1d652794-96a4-5c59-9948-afd441289317"),
					Offset = new(0, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("de57737c-e6c1-5818-bf94-d126ff5304a3"),
					Offset = new(100, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("85c20588-8148-5785-9e9f-44976e8dfef8"),
					Offset = new(200, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("b6ee974a-b405-5367-8c9f-e70a75045c37"),
					Offset = new(300, -100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("8a1052be-8165-5976-849b-511ce92f9956"),
					Offset = new(-200, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("91206d06-70d4-5b75-9fdf-aad7f367fff5"),
					Offset = new(-100, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7abd3edf-f94c-522e-b2be-06a88bdb1cc9"),
					Offset = new(0, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4"),
					Offset = new(100, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("3a801a21-1ef7-5803-bf42-ecd1e8444656"),
					Offset = new(200, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("c54ec31f-2381-5636-b0a5-edd448294b88"),
					Offset = new(300, 0),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("16ad3daf-bd00-5168-885a-74008ce8de35"),
					Offset = new(-200, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("da390fc5-5361-5af9-9398-d3823b81ecba"),
					Offset = new(-100, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("1a549b65-43d5-5068-a3f5-59429946e404"),
					Offset = new(0, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("ec06b9a0-0713-5db1-862c-20fafd2b0764"),
					Offset = new(100, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("cbfef260-a498-599f-a6c0-8a6a51002b76"),
					Offset = new(200, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("852caff2-9ef9-59a3-ae41-e5eec3fa0d21"),
					Offset = new(300, 100),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("96148043-9890-5767-a464-1b12f126da14"),
					Offset = new(-200, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13"),
					Offset = new(-100, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("ab6039e8-38dc-5f91-b15c-6678def87cea"),
					Offset = new(0, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("0ef29fa7-07fb-5495-bb6f-33d164eda994"),
					Offset = new(100, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("e18caa6c-d922-558e-b146-0262173a28bd"),
					Offset = new(200, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7b3285ea-4be6-5eae-9125-cec547fa3fb1"),
					Offset = new(300, 200),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("4ade2cba-18d3-5fd0-a6d4-ba928bb47009"),
					Offset = new(-200, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("474d0b39-6165-58e0-9745-2ca79493a9e8"),
					Offset = new(-100, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0"),
					Offset = new(0, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("00a68179-7585-5f08-89fd-c63464760575"),
					Offset = new(100, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("7b743c81-7260-5ae3-8c7e-fc451751a2c7"),
					Offset = new(200, 300),
					Size = new(100, 100),
				},
				new()
				{
					KeyId = DeviceKeyId.Parse("15c56a3d-0f31-5ebd-bcf1-63aa968be49a"),
					Offset = new(300, 350),
					Size = new(100, 200),
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
