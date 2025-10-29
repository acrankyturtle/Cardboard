using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.FrontendHost;

public class FrontendConfiguration
{
	public required string ReactHostUrl { get; init; }
}
