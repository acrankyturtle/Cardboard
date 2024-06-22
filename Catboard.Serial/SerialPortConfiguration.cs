using Catboard.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Catboard.Serial;

public class SerialDeviceConfiguration
{
	public IReadOnlyCollection<string> ActivePorts { get; init; } = [];
}

public static partial class Services
{
	private static IServiceCollection AddSerialDeviceConfiguration(this IServiceCollection services) =>
		services.AddFileConfiguration<SerialDeviceConfiguration>("serial-ports");
}
