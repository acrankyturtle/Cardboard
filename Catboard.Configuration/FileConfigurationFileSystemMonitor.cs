using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Catboard.Configuration;

internal class FileConfigurationFileSystemMonitor(
	IEnumerable<IRefreshableFileConfiguration> refreshableFileConfiguration,
	IOptions<FileConfigurationOptions> options
) : BackgroundService
{
	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		var path = options.Value.Path;
		using var watcher = new FileSystemWatcher(path, "*.json");
		using var entry = new SemaphoreSlim(0);

		watcher.Changed += OnChanged;
		watcher.Created += OnChanged;
		watcher.Renamed += OnChanged;
		watcher.Deleted += OnChanged;

		while (!stoppingToken.IsCancellationRequested)
		{
			await entry.WaitAsync(stoppingToken);
			await Task.WhenAll(refreshableFileConfiguration.Select(x => x.Refresh()));
		}

		return;

		void OnChanged(object sender, FileSystemEventArgs e)
		{
			try
			{
				// ReSharper disable once AccessToDisposedClosure
				entry.Release();
			}
			catch (ObjectDisposedException)
			{
				// ignore
			}
		}
	}
}

public static partial class Services
{
	public static IServiceCollection AddFileConfigurationFileSystemMonitor(
		this IServiceCollection services
	) => services.AddHostedService<FileConfigurationFileSystemMonitor>();
}
