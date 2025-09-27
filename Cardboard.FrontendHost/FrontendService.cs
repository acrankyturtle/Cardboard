using System.Diagnostics;
using Microsoft.Extensions.Options;

namespace Cardboard.FrontendHost;

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
