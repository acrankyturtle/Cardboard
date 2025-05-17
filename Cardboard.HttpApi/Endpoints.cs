using Microsoft.AspNetCore.Routing;

namespace Cardboard.HttpApi;

public static class Endpoints
{
	public static void MapEndpoints(this IEndpointRouteBuilder builder)
	{
		builder.MapDeviceRepositoryEndpoints();
		builder.MapTagRepositoryEndpoints();
	}
}
