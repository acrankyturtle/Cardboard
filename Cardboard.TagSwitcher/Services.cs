using System.Diagnostics;
using Cardboard.Device;
using Cardboard.Events;
using Cardboard.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cardboard.TagSwitcher;

public static class Services
{
	public static IServiceCollection AddTagSwitcher(this IServiceCollection services) =>
		services.AddHostedService<TagSwitcherService>();
}

file class DeviceTagCache
{
	private HashSet<LayerTag>? _tags;

	public bool NeedsUpdate(IReadOnlyCollection<LayerTag> tags) => _tags is null || !_tags.SetEquals(tags);

	public void Update(IReadOnlyCollection<LayerTag> tags) => _tags = tags.ToHashSet();

	public void Clear() => _tags = null;
}

file class TagSwitcherService(
	IApplicationEventService applicationEventService,
	IDeviceService deviceService,
	ITagRepository tagRepository,
	ILogger<TagSwitcherService> logger
) : IHostedService
{
	private readonly DeviceTagCache _cache = new();

	private ApplicationChangedEvent _current = new("");

	private IDisposable? _applicationSubscription;
	private IDisposable? _deviceSubscription;

	public async Task StartAsync(CancellationToken cancellationToken)
	{
		Debug.Assert(_applicationSubscription == null);
		Debug.Assert(_deviceSubscription == null);

		_applicationSubscription = applicationEventService
			.OnApplicationChanged
			.Subscribe(OnApplicationChanged);
		_deviceSubscription = deviceService.OnDevicesChanged.Subscribe(OnDevicesChanged);

		await UpdateAssociations(cancellationToken);
	}

	public Task StopAsync(CancellationToken cancellationToken)
	{
		Debug.Assert(_applicationSubscription != null);
		Debug.Assert(_deviceSubscription != null);

		_applicationSubscription?.Dispose();
		_deviceSubscription?.Dispose();
		return Task.CompletedTask;
	}

	private void OnApplicationChanged(ApplicationChangedEvent applicationChangedEvent)
	{
		_current = applicationChangedEvent;
		OnUpdateAssociations();
		logger.LogTrace("Application changed: {Event}", applicationChangedEvent);
	}

	private void OnDevicesChanged(DevicesChangedEvent devicesChangedEvent)
	{
		_cache.Clear();
		OnUpdateAssociations();
		logger.LogTrace("Devices changed: {Event}", devicesChangedEvent);
	}

	private void OnUpdateAssociations()
	{
		_ = UpdateAssociations()
			.ContinueWith(
				x => logger.LogError(x.Exception, "Error updating associations"),
				TaskContinuationOptions.OnlyOnFaulted
			);
	}

	private async Task UpdateAssociations(CancellationToken cancellationToken = default)
	{
		var matches = await tagRepository.GetMatches(_current.Path, cancellationToken);
		var tags = matches.SelectMany(x => x.Data.Tags).Distinct().ToList();

		if (!_cache.NeedsUpdate(tags))
			return;

		var command = new SetExternalTags();
		var results = await deviceService.SendCommand(command, tags, cancellationToken: cancellationToken);

		var failed = results
			.Where(x => !x.Result.IsSuccess)
			.Select(x => (x.DeviceId, Exception: x.Result.AssertError()))
			.ToList();

		if (failed.Any())
		{
			_cache.Clear();
		}
		else
		{
			_cache.Update(tags);
		}

		// todo: retry failed devices?
		foreach (var (deviceId, err) in failed)
		{
			logger.LogError(err, "Failed to set external tags on device {DeviceId}: {Error}", deviceId, err);
		}

		logger.LogInformation("New tags: {Tags}", string.Join(", ", tags));
		logger.LogInformation("Updated tags for {Devices} devices", results.Count(x => x.Result.IsSuccess));
	}
}
