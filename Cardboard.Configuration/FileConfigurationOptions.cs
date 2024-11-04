// using Microsoft.Extensions.Configuration;
// using Microsoft.Extensions.DependencyInjection;
//
// namespace Cardboard.Configuration;
//
// internal class FileConfigurationOptions
// {
// 	public const string Key = "FileConfiguration";
//
// 	public string Path { get; set; } = "~/Cardboard/config";
// }
//
// public static partial class Services
// {
// 	public static IServiceCollection AddFileConfigurationOptions(
// 		this IServiceCollection services, IConfiguration configuration
// 	)
// 	{
// 		services.Configure<FileConfigurationOptions>(builder)
// 		configurationManager.GetSection(FileConfigurationOptions.Key).Bind(new FileConfigurationOptions());
// 		return configurationManager;
// 	}
// }
