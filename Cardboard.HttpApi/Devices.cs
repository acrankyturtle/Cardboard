using Cardboard.Device;
using Cardboard.Repositories;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;

namespace Cardboard.HttpApi;

public static class Devices
{
	public static void MapDeviceRepositoryEndpoints(this IEndpointRouteBuilder builder)
	{
		var group = builder.MapGroup("devices").WithTags("Devices");

		group.MapGet("/", GetDevices).WithName("Get Devices").Produces<DeviceListResponse>().WithOpenApi();
		group
			.MapGet("/{id}/details", GetDeviceDetails)
			.WithName("Get Device Details")
			.Produces<DeviceDetailsResponse>()
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapGet("/{id}", GetDeviceProfile)
			.WithName("Get Device Profile")
			.Produces<GetDeviceProfileResponse>()
			.Produces(StatusCodes.Status404NotFound)
			.WithOpenApi();
		group
			.MapPut("/{id}", UpdateDeviceProfile)
			.WithName("Update Device Profile")
			.Produces(StatusCodes.Status204NoContent)
			.Produces(StatusCodes.Status400BadRequest)
			.WithOpenApi();
	}

	private static async Task<Ok<DeviceListResponse>> GetDevices(
		IDeviceRepository deviceRepository,
		CancellationToken cancellationToken
	) =>
		TypedResults.Ok(
			new DeviceListResponse { Devices = await deviceRepository.GetDevices(cancellationToken) }
		);

	private static async Task<Results<Ok<DeviceDetailsResponse>, NotFound>> GetDeviceDetails(
		IDeviceRepository deviceRepository,
		DeviceId id,
		CancellationToken cancellationToken
	) =>
		await deviceRepository.GetDeviceDetails(id, cancellationToken) is { } deviceDetails
			? TypedResults.Ok(new DeviceDetailsResponse { DeviceDetails = deviceDetails })
			: TypedResults.NotFound();

	private static async Task<Results<Ok<GetDeviceProfileResponse>, NotFound>> GetDeviceProfile(
		IDeviceRepository deviceRepository,
		DeviceId id,
		CancellationToken cancellationToken
	) =>
		await deviceRepository.GetDeviceProfile(id, cancellationToken) is { } deviceProfile
			? TypedResults.Ok(new GetDeviceProfileResponse { DeviceProfile = deviceProfile })
			: TypedResults.NotFound();

	private static async Task<
		Results<NoContent, NotFound, BadRequest, InternalServerError>
	> UpdateDeviceProfile(
		IDeviceRepository deviceRepository,
		DeviceId id,
		DeviceProfile deviceProfile,
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
	public required DeviceProfile DeviceProfile { get; init; }
}
