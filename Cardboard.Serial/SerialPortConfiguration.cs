using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Serial;

public class SerialDeviceOptions
{
	internal const string SectionName = "SerialDevices";

	public IReadOnlyCollection<string> Ports { get; init; } = [];
}

public static partial class Services
{
	private static IServiceCollection AddSerialDeviceConfiguration(
		this IServiceCollection services,
		IConfiguration configuration
	) => services.Configure<SerialDeviceOptions>(configuration.GetSection(SerialDeviceOptions.SectionName));
}
