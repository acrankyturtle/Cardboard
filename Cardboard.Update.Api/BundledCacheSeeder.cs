using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cardboard.Update.Api;

internal sealed class BundledCacheSeeder(
	IOptions<MetadataCacheConfiguration> metadataConfig,
	IOptions<DeviceIconCacheConfiguration> iconConfig,
	ILogger<BundledCacheSeeder> logger
) : IHostedService
{
	private static readonly string BundledBasePath = Path.Combine(AppContext.BaseDirectory, "bundled");

	public Task StartAsync(CancellationToken cancellationToken)
	{
		SeedMetadata();
		SeedDeviceIcons();
		return Task.CompletedTask;
	}

	public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

	private void SeedMetadata()
	{
		if (
			string.IsNullOrEmpty(metadataConfig.Value.MetadataCache)
			|| string.IsNullOrEmpty(metadataConfig.Value.MetadataCacheManifest)
		)
		{
			return;
		}

		SeedCache(
			metadataConfig.Value.MetadataCache,
			metadataConfig.Value.MetadataCacheManifest,
			"metadata",
			"*.json",
			Path.GetFileName
		);
	}

	private void SeedDeviceIcons()
	{
		if (
			string.IsNullOrEmpty(iconConfig.Value.IconCache)
			|| string.IsNullOrEmpty(iconConfig.Value.IconCacheManifest)
		)
		{
			return;
		}

		SeedCache(
			iconConfig.Value.IconCache,
			iconConfig.Value.IconCacheManifest,
			"device-icons",
			"*",
			DeviceIconCacheHelper.HashFileName
		);
	}

	private void SeedCache(
		string cachePath,
		string manifestPath,
		string bundledSubdirectory,
		string searchPattern,
		Func<string, string> getCacheFileName
	)
	{
		if (string.IsNullOrEmpty(cachePath) || string.IsNullOrEmpty(manifestPath))
			return;

		cachePath = Environment.ExpandEnvironmentVariables(cachePath);
		manifestPath = Environment.ExpandEnvironmentVariables(manifestPath);

		if (HasExistingCache(manifestPath))
			return;

		var bundledPath = Path.Combine(BundledBasePath, bundledSubdirectory);
		if (!Directory.Exists(bundledPath))
		{
			logger.LogDebug("No bundled {Name} directory found at {Path}", bundledSubdirectory, bundledPath);
			return;
		}

		var sourceFiles = Directory.GetFiles(bundledPath, searchPattern);
		if (sourceFiles.Length == 0)
			return;

		logger.LogInformation(
			"Seeding {Name} cache from {Count} bundled files",
			bundledSubdirectory,
			sourceFiles.Length
		);
		Directory.CreateDirectory(cachePath);

		var manifest = new CacheManifest();
		foreach (var sourceFile in sourceFiles)
		{
			var cacheFileName = getCacheFileName(Path.GetFileName(sourceFile));
			var destFile = Path.Combine(cachePath, cacheFileName);
			File.Copy(sourceFile, destFile, overwrite: true);
			manifest.Files.Add(cacheFileName);
		}

		SaveManifest(manifest, manifestPath);
	}

	private static bool HasExistingCache(string manifestPath)
	{
		try
		{
			using var stream = File.OpenRead(manifestPath);
			var manifest = JsonSerializer.Deserialize<CacheManifest>(stream);
			return manifest?.Files.Count > 0;
		}
		catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
		{
			return false;
		}
	}

	private static void SaveManifest(CacheManifest manifest, string manifestPath)
	{
		Directory.CreateDirectory(
			Path.GetDirectoryName(manifestPath)
				?? throw new InvalidOperationException("Invalid manifest path")
		);
		using var stream = File.Create(manifestPath);
		JsonSerializer.Serialize(stream, manifest);
	}
}

partial class Services
{
	public static IServiceCollection AddBundledCacheSeeder(this IServiceCollection services)
	{
		services.AddHostedService<BundledCacheSeeder>();
		return services;
	}
}
