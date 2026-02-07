using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Device;
using Cardboard.Repositories;
using Cardboard.Update;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using JsonOptions = Microsoft.AspNetCore.Http.Json.JsonOptions;

namespace Cardboard.HttpApi;

public static class Devices
{
	public static void MapDeviceRepositoryEndpoints(this IEndpointRouteBuilder builder)
	{
		var group = builder.MapGroup("devices").WithTags("Devices");

		group.MapGet("/", GetDevices).WithName("Get Devices").Produces<DeviceListResponse>();
		group
			.MapGet("/{id}", GetDeviceDetails)
			.WithName("Get Device Details")
			.Produces<DeviceDetailsResponse>()
			.Produces(StatusCodes.Status404NotFound);
		group
			.MapGet("/{id}/profile", GetDeviceProfile)
			.WithName("Get Device Profile")
			.Produces<GetDeviceProfileResponse>()
			.Produces(StatusCodes.Status404NotFound);
		group
			.MapPut("/{id}/profile", UpdateDeviceProfile)
			.WithName("Update Device Profile")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status404NotFound);
		group
			.MapPost("/{id}/bootloader", EnterBootloader)
			.WithName("Enter Bootloader")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status404NotFound);
		group
			.MapGet("/{id}/settings", GetDeviceSettings)
			.WithName("Get Device Settings")
			.Produces<GetDeviceSettingsResponse>()
			.Produces(StatusCodes.Status404NotFound);
		group
			.MapPut("/{id}/settings", UpdateDeviceSettings)
			.WithName("Update Settings")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status404NotFound);
		group
			.MapPost("/{id}/update", UpdateFirmware)
			.WithName("Update Firmware")
			.Produces(StatusCodes.Status200OK, contentType: "text/event-stream");
		group
			.MapPost("/update", UpdateBootloaderDevice)
			.WithName("Update Bootloader Device")
			.Produces(StatusCodes.Status200OK, contentType: "text/event-stream");
		group
			.MapGet("/events", StreamDeviceEvents)
			.WithName("Device Events Stream")
			.Produces(StatusCodes.Status200OK, contentType: "text/event-stream");
		group
			.MapGet("/firmware", GetFirmwareList)
			.WithName("Get Firmware List")
			.Produces<FirmwareListResponse>();
	}

	private static async Task<Ok<DeviceListResponse>> GetDevices(
		[FromServices] IDeviceRepository deviceRepository,
		CancellationToken cancellationToken
	) =>
		TypedResults.Ok(
			new DeviceListResponse { Devices = await deviceRepository.GetDevices(cancellationToken) }
		);

	private static async Task<Results<Ok<DeviceDetailsResponse>, NotFound>> GetDeviceDetails(
		[FromServices] IDeviceRepository deviceRepository,
		[FromRoute] DeviceId id,
		CancellationToken cancellationToken
	) =>
		await deviceRepository.GetDeviceDetails(id, cancellationToken) is { } deviceDetails
			? TypedResults.Ok(new DeviceDetailsResponse { DeviceDetails = deviceDetails })
			: TypedResults.NotFound();

	private static async Task<Results<Ok<GetDeviceProfileResponse>, NotFound>> GetDeviceProfile(
		[FromServices] IDeviceRepository deviceRepository,
		[FromRoute] DeviceId id,
		CancellationToken cancellationToken
	) =>
		await deviceRepository.GetDeviceProfile(id, cancellationToken) is { } deviceProfile
			? TypedResults.Ok(new GetDeviceProfileResponse { DeviceProfile = deviceProfile })
			: TypedResults.NotFound();

	private static async Task<
		Results<NoContent, NotFound, BadRequest, InternalServerError>
	> UpdateDeviceProfile(
		[FromServices] IDeviceRepository deviceRepository,
		[FromRoute] DeviceId id,
		Profile deviceProfile,
		CancellationToken cancellationToken
	) =>
		await deviceRepository.UpdateDeviceProfile(id, deviceProfile, cancellationToken) switch
		{
			UpdateDeviceProfileResult.Success => TypedResults.NoContent(),
			UpdateDeviceProfileResult.NotFound => TypedResults.NotFound(),
			UpdateDeviceProfileResult.ProfileError => TypedResults.BadRequest(),
			UpdateDeviceProfileResult.DeviceError => TypedResults.InternalServerError(),
			_ => throw new InvalidOperationException(),
		};

	private static async Task<Results<NoContent, NotFound>> EnterBootloader(
		[FromServices] IDeviceRepository deviceRepository,
		[FromRoute] DeviceId id,
		CancellationToken cancellationToken
	) =>
		await deviceRepository.EnterBootloader(id, cancellationToken)
			? TypedResults.NoContent()
			: TypedResults.NotFound();

	private static async Task<Results<Ok<GetDeviceSettingsResponse>, NotFound>> GetDeviceSettings(
		[FromServices] IDeviceRepository deviceRepository,
		[FromRoute] DeviceId id,
		CancellationToken cancellationToken
	) =>
		await deviceRepository.GetDeviceSettings(id, cancellationToken) is { } deviceSettings
			? TypedResults.Ok(new GetDeviceSettingsResponse { DeviceSettings = deviceSettings })
			: TypedResults.NotFound();

	private static async Task<Results<NoContent, NotFound, InternalServerError>> UpdateDeviceSettings(
		[FromServices] IDeviceRepository deviceRepository,
		[FromRoute] DeviceId id,
		DeviceSettings deviceSettings,
		CancellationToken cancellationToken
	) =>
		await deviceRepository.UpdateDeviceSettings(id, deviceSettings, cancellationToken) switch
		{
			UpdateDeviceSettingsResult.Success => TypedResults.NoContent(),
			UpdateDeviceSettingsResult.NotFound => TypedResults.NotFound(),
			UpdateDeviceSettingsResult.DeviceError => TypedResults.InternalServerError(),
			_ => throw new InvalidOperationException(),
		};

	private static async Task UpdateFirmware(
		HttpContext context,
		[FromServices] IDeviceRepository deviceRepository,
		[FromServices] IOptions<JsonOptions> jsonOptions,
		[FromRoute(Name = "id")] DeviceId deviceId,
		[FromQuery(Name = "migrate")] bool migrateData,
		[FromQuery] string? version,
		CancellationToken cancellationToken
	)
	{
		context.Response.Headers.ContentType = "text/event-stream";
		context.Response.Headers.CacheControl = "no-cache";
		context.Response.Headers.Connection = "keep-alive";

		var parsedVersion = version is not null ? Version.Parse(version) : null;

		try
		{
			await foreach (
				var report in deviceRepository.UpdateFirmware(
					deviceId,
					parsedVersion,
					migrateData,
					cancellationToken
				)
			)
			{
				var evt = ToEvent(report);
				var json = JsonSerializer.Serialize(evt, jsonOptions.Value.SerializerOptions);
				await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
				await context.Response.Body.FlushAsync(cancellationToken);
			}
		}
		catch (Exception ex)
		{
			var evt = new FirmwareUpdateErrorEvent
			{
				Result = UpdateFirmwareResult.UnknownError,
				Message = ex.Message,
			};
			var json = JsonSerializer.Serialize<FirmwareUpdateEvent>(
				evt,
				jsonOptions.Value.SerializerOptions
			);
			await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
			await context.Response.Body.FlushAsync(cancellationToken);
		}
	}

	private static async Task UpdateBootloaderDevice(
		HttpContext context,
		[FromServices] IFirmwareSource firmwareSource,
		[FromServices] IDeviceUpdater deviceUpdater,
		[FromServices] IOptions<JsonOptions> jsonOptions,
		[FromQuery(Name = "deviceType")] DeviceTypeId deviceType,
		[FromQuery] string? variant,
		[FromQuery] string? version,
		CancellationToken cancellationToken
	)
	{
		context.Response.Headers.ContentType = "text/event-stream";
		context.Response.Headers.CacheControl = "no-cache";
		context.Response.Headers.Connection = "keep-alive";

		try
		{
			// Get firmware from source
			Version? parsedVersion;
			if (version is null)
			{
				// Get latest version first
				parsedVersion = await firmwareSource.GetLatestVersion(deviceType, variant, cancellationToken);
			}
			else
				Version.TryParse(version, out parsedVersion);

			if (parsedVersion is null)
			{
				var evt = new FirmwareUpdateErrorEvent
				{
					Result = UpdateFirmwareResult.FirmwareNotFound,
					Message = "No firmware available for this device type.",
				};
				var json = JsonSerializer.Serialize<FirmwareUpdateEvent>(
					evt,
					jsonOptions.Value.SerializerOptions
				);
				await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
				await context.Response.Body.FlushAsync(cancellationToken);
				return;
			}

			var firmware = await firmwareSource.GetFirmware(
				deviceType,
				variant,
				parsedVersion,
				cancellationToken
			);

			if (firmware is null)
			{
				var evt = new FirmwareUpdateErrorEvent
				{
					Result = UpdateFirmwareResult.FirmwareNotFound,
					Message = "The specified firmware version was not found.",
				};
				var json = JsonSerializer.Serialize<FirmwareUpdateEvent>(
					evt,
					jsonOptions.Value.SerializerOptions
				);
				await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
				await context.Response.Body.FlushAsync(cancellationToken);
				return;
			}

			await foreach (
				var report in deviceUpdater.UpdateDevice(firmware).WithCancellation(CancellationToken.None)
			)
			{
				var evt = ToEvent(report);
				var json = JsonSerializer.Serialize(evt, jsonOptions.Value.SerializerOptions);
				await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
				await context.Response.Body.FlushAsync(cancellationToken);
			}
		}
		catch (Exception ex)
		{
			var evt = new FirmwareUpdateErrorEvent
			{
				Result = UpdateFirmwareResult.UnknownError,
				Message = ex.Message,
			};
			var json = JsonSerializer.Serialize<FirmwareUpdateEvent>(
				evt,
				jsonOptions.Value.SerializerOptions
			);
			await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
			await context.Response.Body.FlushAsync(cancellationToken);
		}
	}

	private static FirmwareUpdateEvent ToEvent(FirmwareUpdateReport report) =>
		report switch
		{
			FirmwareUpdateProgress progress => new FirmwareUpdateProgressEvent { Stage = progress.Stage },
			FirmwareUpdateComplete { Result: UpdateFirmwareResult.Success } => new FirmwareUpdateSuccessEvent
			{
				AlreadyUpToDate = false,
			},
			FirmwareUpdateComplete { Result: UpdateFirmwareResult.AlreadyUpToDate } =>
				new FirmwareUpdateSuccessEvent { AlreadyUpToDate = true },
			FirmwareUpdateComplete complete => new FirmwareUpdateErrorEvent
			{
				Result = complete.Result,
				Message = GetErrorMessage(complete.Result),
			},
			_ => throw new InvalidOperationException($"Unknown report type: {report.GetType()}"),
		};

	private static string GetErrorMessage(UpdateFirmwareResult result) =>
		result switch
		{
			UpdateFirmwareResult.DeviceNotFound => "The specified device was not found.",
			UpdateFirmwareResult.FirmwareNotFound => "No firmware is available for this device.",
			UpdateFirmwareResult.DeviceAlreadyInBootloader =>
				"Another device is already in bootloader mode. Please complete or cancel that update first.",
			UpdateFirmwareResult.DeviceTypeMismatch => "The firmware does not match the device type.",
			UpdateFirmwareResult.DeviceVariantMismatch => "The firmware does not match the device variant.",
			UpdateFirmwareResult.FailedToGetProfile => "Failed to backup the device profile before updating.",
			UpdateFirmwareResult.FailedToRestoreProfile =>
				"The update completed but failed to restore the device profile.",
			UpdateFirmwareResult.FailedToGetSettings =>
				"Failed to backup the device settings before updating.",
			UpdateFirmwareResult.FailedToRestoreSettings =>
				"The update completed but failed to restore the device settings.",
			UpdateFirmwareResult.FailedToEnterBootloader => "Failed to put the device into bootloader mode.",
			UpdateFirmwareResult.FailedToFindBootloader =>
				"The device entered bootloader mode but was not detected by the system.",
			UpdateFirmwareResult.DeviceNotReconnected =>
				"The update completed but the device did not reconnect.",
			_ => "An unknown error occurred.",
		};

	private static readonly TimeSpan HeartbeatInterval = TimeSpan.FromSeconds(30);

	private static async Task StreamDeviceEvents(
		HttpContext context,
		[FromServices] IDeviceService deviceService,
		[FromServices] IOptions<JsonOptions> jsonOptions,
		CancellationToken cancellationToken
	)
	{
		context.Response.Headers.ContentType = "text/event-stream";
		context.Response.Headers.CacheControl = "no-cache";
		context.Response.Headers.Connection = "keep-alive";

		using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
		var linkedToken = cts.Token;

		// Send initial keepalive to confirm connection
		try
		{
			await context.Response.WriteAsync(": connected\n\n", linkedToken);
			await context.Response.Body.FlushAsync(linkedToken);
		}
		catch (Exception) when (linkedToken.IsCancellationRequested)
		{
			return;
		}

		// Heartbeat task to detect stale connections
		var heartbeatTask = Task.Run(
			async () =>
			{
				using var timer = new PeriodicTimer(HeartbeatInterval);
				while (await timer.WaitForNextTickAsync(linkedToken))
				{
					try
					{
						await context.Response.WriteAsync(": keepalive\n\n", linkedToken);
						await context.Response.Body.FlushAsync(linkedToken);
					}
					catch (Exception)
					{
						// Write failed - client disconnected
						await cts.CancelAsync();
						return;
					}
				}
			},
			linkedToken
		);

		using var subscription = deviceService.OnDevicesChanged.Subscribe(async evt =>
		{
			try
			{
				var data = new DevicesChangedEventData
				{
					Added = evt.Added.Select(d => d.Id).ToList(),
					Removed = evt.Removed.Select(d => d.Id).ToList(),
				};
				var json = JsonSerializer.Serialize(data, jsonOptions.Value.SerializerOptions);
				await context.Response.WriteAsync($"event: devicesChanged\ndata: {json}\n\n", linkedToken);
				await context.Response.Body.FlushAsync(linkedToken);
			}
			catch (Exception)
			{
				// Write failed - client disconnected
				await cts.CancelAsync();
			}
		});

		try
		{
			await heartbeatTask;
		}
		catch (OperationCanceledException)
		{
			// Expected when client disconnects or server shuts down
		}
	}

	private static async Task<Ok<FirmwareListResponse>> GetFirmwareList(
		[FromServices] IFirmwareSource firmwareSource,
		[FromServices] IMetadataSource metadataSource,
		CancellationToken cancellationToken
	)
	{
		var entries = await firmwareSource.GetFirmwareList(cancellationToken);
		var metadataList = await metadataSource.GetMetadataList(cancellationToken);

		var metadataLookup = metadataList.ToDictionary(m => m.DeviceTypeId);

		var firmwareWithNames = entries
			.Select(e =>
			{
				var name = metadataLookup.TryGetValue(e.DeviceTypeId, out var metadata)
					? FormatFirmwareName(metadata.Model, e.Variant)
					: FormatFirmwareName(e.DeviceTypeId.ToString(), e.Variant);

				return new FirmwareListEntryWithName
				{
					DeviceTypeId = e.DeviceTypeId,
					Name = name,
					Variant = e.Variant,
					LatestVersion = e.LatestVersion,
				};
			})
			.ToList();

		return TypedResults.Ok(new FirmwareListResponse { Firmware = firmwareWithNames });
	}

	private static string FormatFirmwareName(string baseName, string? variant) =>
		variant?.ToUpperInvariant() switch
		{
			null => baseName,
			"BLK" => $"{baseName} (black)",
			"WHT" => $"{baseName} (white)",
			_ => $"{baseName} ({variant})",
		};
}

public sealed class FirmwareListResponse
{
	public required IReadOnlyCollection<FirmwareListEntryWithName> Firmware { get; init; }
}

public sealed class FirmwareListEntryWithName
{
	public required DeviceTypeId DeviceTypeId { get; init; }
	public required string Name { get; init; }
	public required string? Variant { get; init; }
	public required Version LatestVersion { get; init; }
}

public sealed class DevicesChangedEventData
{
	public required IReadOnlyCollection<DeviceId> Added { get; init; }
	public required IReadOnlyCollection<DeviceId> Removed { get; init; }
}

public sealed class DeviceListResponse
{
	public required IReadOnlyCollection<DeviceSummary> Devices { get; init; }
}

public sealed class DeviceDetailsResponse
{
	public required DeviceDetails DeviceDetails { get; init; }
}

public sealed class GetDeviceProfileResponse
{
	public required Profile DeviceProfile { get; init; }
}

public sealed class GetDeviceSettingsResponse
{
	public required DeviceSettings DeviceSettings { get; init; }
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(FirmwareUpdateProgressEvent), "progress")]
[JsonDerivedType(typeof(FirmwareUpdateSuccessEvent), "success")]
[JsonDerivedType(typeof(FirmwareUpdateErrorEvent), "error")]
public abstract class FirmwareUpdateEvent;

public sealed class FirmwareUpdateProgressEvent : FirmwareUpdateEvent
{
	public required FirmwareUpdateStage Stage { get; init; }
}

public sealed class FirmwareUpdateSuccessEvent : FirmwareUpdateEvent
{
	public required bool AlreadyUpToDate { get; init; }
}

public sealed class FirmwareUpdateErrorEvent : FirmwareUpdateEvent
{
	public required UpdateFirmwareResult Result { get; init; }
	public required string Message { get; init; }
}
