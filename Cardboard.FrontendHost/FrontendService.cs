using System.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Cardboard.FrontendHost;

partial class Services
{
	public static IServiceCollection AddFrontendService(
		this IServiceCollection services,
		IConfigurationSection configuration
	)
	{
		services.Configure<FrontendConfiguration>(configuration);
		return services.AddSingleton<IFrontendService, FrontendService>();
	}
}

public interface IFrontendService
{
	void Open();
}

internal class FrontendService(IOptions<FrontendConfiguration> options) : IFrontendService
{
	private readonly FrontendConfiguration _config = options.Value;

	public void Open()
	{
		var url = _config.ReactHostUrl;
		Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
	}
}
