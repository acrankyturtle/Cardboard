using Microsoft.Extensions.Configuration;

namespace Catboard.Configuration;

internal class FileConfigurationOptions
{
	public const string Key = "FileConfiguration";

	public string Path { get; set; } = "~/catboard/config";
}

public static partial class Services
{
	public static ConfigurationManager AddFileConfigurationOptions(
		this ConfigurationManager configurationManager
	)
	{
		configurationManager.GetSection(FileConfigurationOptions.Key).Bind(new FileConfigurationOptions());
		return configurationManager;
	}
}
