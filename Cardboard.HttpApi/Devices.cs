using System.Text.Json;
using Cardboard.Device;
using Cardboard.Repositories;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Cardboard.HttpApi;

public static class Devices
{
	public static void MapDeviceRepositoryEndpoints(this IEndpointRouteBuilder builder)
	{
		var group = builder.MapGroup("devices").WithTags("Devices");

		group.MapGet("/", GetDevices).WithName("Get Devices").Produces<DeviceListResponse>().WithOpenApi();
		group
			.MapGet("/{id}", GetDeviceDetails)
			.WithName("Get Device Details")
			.Produces<DeviceDetailsResponse>()
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapGet("/{id}/profile", GetDeviceProfile)
			.WithName("Get Device Profile")
			.Produces<GetDeviceProfileResponse>()
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapPut("/{id}/profile", UpdateDeviceProfile)
			.WithName("Update Device Profile")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status400BadRequest)
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapPost("/{id}/bootloader", EnterBootloader)
			.WithName("Enter Bootloader")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapGet("/{id}/settings", GetDeviceSettings)
			.WithName("Get Device Settings")
			.Produces<GetDeviceSettingsResponse>()
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapPut("/{id}/settings", UpdateDeviceSettings)
			.WithName("Update Settings")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapPost("/{id}/update", UpdateFirmware)
			.WithName("Update Firmware")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status503ServiceUnavailable)
			.WithOpenApi();
		group
			.MapGet("/events", StreamDeviceEvents)
			.WithName("Device Events Stream")
			.Produces(StatusCodes.Status200OK, contentType: "text/event-stream")
			.WithOpenApi();
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

	private static async Task<Results<Ok<UpdateFirmwareResponse>, InternalServerError>> UpdateFirmware(
		[FromServices] IDeviceRepository deviceRepository,
		[FromRoute(Name = "id")] DeviceId deviceId,
		[FromQuery(Name = "migrate")] bool migrateProfile,
		[FromQuery] uint? version,
		CancellationToken cancellationToken
	)
	{
		return await deviceRepository.UpdateFirmware(deviceId, version, cancellationToken) is { } updated
			? TypedResults.Ok(
				new UpdateFirmwareResponse
				{
					Action = updated ? UpdateFirmwareAction.Updated : UpdateFirmwareAction.AlreadyUpToDate,
				}
			)
			: TypedResults.InternalServerError();
	}

	private static readonly TimeSpan HeartbeatInterval = TimeSpan.FromSeconds(30);

	private static async Task StreamDeviceEvents(
		HttpContext context,
		[FromServices] IDeviceService deviceService,
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
				var json = JsonSerializer.Serialize(data);
				await context.Response.WriteAsync(
					$"event: devicesChanged\ndata: {json}\n\n",
					linkedToken
				);
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

public sealed class UpdateFirmwareResponse
{
	public required UpdateFirmwareAction Action { get; init; }
}

public enum UpdateFirmwareAction
{
	Updated,
	AlreadyUpToDate,
}
