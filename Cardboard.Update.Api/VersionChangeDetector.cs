using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

internal sealed class VersionChangeDetector(
	IEnumerable<IClearDiskCache> diskCaches,
	IOptions<VersionChangeDetectorConfiguration> config,
	ILogger<VersionChangeDetector> logger
) : IHostedService
{
	public async Task StartAsync(CancellationToken cancellationToken)
	{
		var versionFilePath = config.Value.VersionFile;
		if (string.IsNullOrEmpty(versionFilePath))
		{
			logger.LogWarning("Version file path is not configured; skipping version change detection");
			return;
		}

		versionFilePath = Environment.ExpandEnvironmentVariables(versionFilePath);

		var currentVersion = GetCurrentVersion();
		var lastVersion = ReadLastVersion(versionFilePath);

		if (lastVersion is not null)
		{
			if (lastVersion == currentVersion)
			{
				logger.LogDebug("Version unchanged ({Version}); skipping cache clear", currentVersion);
				return;
			}

			logger.LogInformation(
				"Version changed from {OldVersion} to {NewVersion}; clearing disk caches",
				lastVersion,
				currentVersion
			);

			foreach (var cache in diskCaches)
			{
				await cache.ClearDiskCache();
			}
		}
		else
			logger.LogInformation("First run detected (version {Version})", currentVersion);

		WriteVersion(versionFilePath, currentVersion);
	}

	public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

	private static string GetCurrentVersion()
	{
		var assembly = Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly();
		return assembly.GetName().Version?.ToString() ?? "0.0.0.0";
	}

	private string? ReadLastVersion(string path)
	{
		try
		{
			var json = File.ReadAllText(path);
			var doc = JsonSerializer.Deserialize<VersionDocument>(json);
			return doc?.Version;
		}
		catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
		{
			return null;
		}
		catch (Exception ex)
		{
			logger.LogWarning(ex, "Failed to read version file at {Path}; treating as first run", path);
			return null;
		}
	}

	private void WriteVersion(string path, string version)
	{
		try
		{
			var directory = Path.GetDirectoryName(path);
			if (!string.IsNullOrEmpty(directory))
				Directory.CreateDirectory(directory);

			var json = JsonSerializer.Serialize(new VersionDocument { Version = version });
			File.WriteAllText(path, json);
		}
		catch (Exception ex)
		{
			logger.LogError(ex, "Failed to write version file at {Path}", path);
		}
	}

	private sealed class VersionDocument
	{
		public string? Version { get; init; }
	}
}

internal sealed class VersionChangeDetectorConfiguration
{
	public string? VersionFile { get; set; }
}

partial class Services
{
	public static IServiceCollection AddVersionChangeDetector(
		this IServiceCollection services,
		Microsoft.Extensions.Configuration.IConfiguration pathsConfig
	)
	{
		services.Configure<VersionChangeDetectorConfiguration>(pathsConfig);
		services.AddHostedService<VersionChangeDetector>();
		return services;
	}
}
