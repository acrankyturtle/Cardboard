using System.Diagnostics;
using Cardboard.Device;
using Cardboard.Events;
using Cardboard.Repositories;
using Cardboard.Utilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cardboard.Services;

partial class Services
{
	private static IServiceCollection AddTagSwitcher(this IServiceCollection services)
	{
		return services.AddHostedService<TagSwitcherService>();
	}
}

public record TagStatusEntry
{
	public required LayerTag Tag { get; init; }
	public required ApplicationAssociationId Source { get; init; }
}

file class TagSwitcherService(
	IAssociationEventService associationEventService,
	IDeviceService deviceService,
	ILogger<TagSwitcherService> logger
) : IHostedService
{
	private readonly DeviceTagCache _cache = new();

	private IDisposable? _associationSubscription;

	private AssociationChangedEvent _current = new([]);
	private IDisposable? _deviceSubscription;

	public Task StartAsync(CancellationToken cancellationToken)
	{
		Debug.Assert(_associationSubscription == null);
		Debug.Assert(_deviceSubscription == null);

		_associationSubscription = associationEventService.OnActiveAssociationChanged.SubscribeAsync(
			OnAssociationChanged
		);
		_deviceSubscription = deviceService.OnDevicesChanged.SubscribeAsync(OnDevicesChanged);

		return Task.CompletedTask;
	}

	public Task StopAsync(CancellationToken cancellationToken)
	{
		Debug.Assert(_associationSubscription != null);
		Debug.Assert(_deviceSubscription != null);

		_associationSubscription?.Dispose();
		_deviceSubscription?.Dispose();
		return Task.CompletedTask;
	}

	private async Task OnAssociationChanged(AssociationChangedEvent associationChangedEvent)
	{
		_current = associationChangedEvent;
		await UpdateAssociations();
	}

	private async Task OnDevicesChanged(DevicesChangedEvent devicesChangedEvent)
	{
		_cache.Clear();
		await UpdateAssociations();
	}

	private async Task UpdateAssociations(CancellationToken cancellationToken = default)
	{
		var entries = _current
			.Associations.SelectMany(x =>
				x.Data.Tags.Select(t => new TagStatusEntry { Tag = t, Source = x.Id })
			)
			.ToList();

		if (!_cache.NeedsUpdate(entries))
			return;

		var tags = entries.Select(x => x.Tag).Distinct().ToList();

		var command = new SetExternalTags();
		var results = await deviceService.SendCommand(command, tags, cancellationToken: cancellationToken);

		var failed = results
			.Where(x => !x.Result.IsSuccess)
			.Select(x => (x.DeviceId, Exception: x.Result.AssertError()))
			.ToList();

		if (failed.Any())
			// todo: log?
			_cache.Clear();
		else
			_cache.Update(entries);

		// todo: retry failed devices?
		foreach (var (deviceId, err) in failed)
			logger.LogError(err, "Failed to set external tags on device {DeviceId}: {Error}", deviceId, err);

		logger.LogInformation("New tags: {Tags}", string.Join(", ", tags));
		logger.LogInformation("Updated tags for {Devices} devices", results.Count(x => x.Result.IsSuccess));
	}
}

file class DeviceTagCache
{
	private HashSet<TagStatusEntry>? _tags;

	public bool NeedsUpdate(IEnumerable<TagStatusEntry> tags)
	{
		return _tags is null || !_tags.SetEquals(tags);
	}

	public void Update(IReadOnlyCollection<TagStatusEntry> tags)
	{
		_tags = tags.ToHashSet();
	}

	public void Clear()
	{
		_tags = null;
	}
}
