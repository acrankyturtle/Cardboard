using Cardboard.Events;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Cardboard.HttpApi;

public static class InputDevices
{
	public static void MapInputDeviceEndpoints(this IEndpointRouteBuilder builder)
	{
		var group = builder.MapGroup("input-devices").WithTags("Input Devices");

		group
			.MapGet("/", GetInputDevices)
			.WithName("Get Input Devices")
			.Produces<GetInputDevicesResponse>()
			.WithOpenApi();
	}

	private static async Task<Ok<GetInputDevicesResponse>> GetInputDevices(
		[FromServices] IInputDeviceListService inputDeviceListService,
		CancellationToken cancellationToken
	) =>
		TypedResults.Ok(
			new GetInputDevicesResponse
			{
				Devices = await inputDeviceListService.GetInputDevices(cancellationToken),
			}
		);
}

public sealed class GetInputDevicesResponse
{
	public required IReadOnlyList<InputDeviceInfo> Devices { get; init; }
}
