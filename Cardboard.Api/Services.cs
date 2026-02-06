using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Api;

public static class Services
{
	public static IServiceCollection ConfigureWebJsonOptions(this IServiceCollection services) =>
		services.Configure<JsonOptions>(options =>
		{
			options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
			options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
			options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
		});
}
