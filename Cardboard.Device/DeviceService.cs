using System.Reactive.Subjects;
using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Device;

public interface IDeviceService
{
	IObservable<DevicesChangedEvent> OnDevicesChanged { get; }

	Task<IReadOnlyCollection<DeviceInfo>> GetDevices(CancellationToken cancellationToken = default);

	Task<IReadOnlyCollection<(DeviceId DeviceId, Result<TOut, Exception> Result)>> SendCommand<TIn, TOut>(
		ICommand<TIn, TOut> command,
		TIn input,
		Predicate<DeviceInfo>? filter = null,
		CancellationToken cancellationToken = default
	)
		where TIn : notnull;
}

internal class DeviceService : IDeviceService, IDisposable
{
	private readonly IReadOnlyList<IDeviceProvider> _providers;
	private readonly Subject<DevicesChangedEvent> _devicesChangedSubject = new();
	private readonly IReadOnlyCollection<IDisposable> _subscriptions;

	public DeviceService(IEnumerable<IDeviceProvider> providers)
	{
		_providers = providers.ToList();

		_subscriptions = _providers
			.Select(x => OnDevicesChanged.Subscribe(_devicesChangedSubject.OnNext))
			.ToList();
	}

	public IObservable<DevicesChangedEvent> OnDevicesChanged => _devicesChangedSubject;

	public async Task<IReadOnlyCollection<DeviceInfo>> GetDevices(CancellationToken cancellationToken) =>
		(await Task.WhenAll(_providers.Select(async x => await x.GetDevices(cancellationToken))))
			.SelectMany(x => x)
			.ToList();

	public async Task<IReadOnlyCollection<(DeviceId DeviceId, Result<TOut, Exception> Result)>> SendCommand<
		TIn,
		TOut
	>(
		ICommand<TIn, TOut> command,
		TIn input,
		Predicate<DeviceInfo>? filter,
		CancellationToken cancellationToken
	)
		where TIn : notnull
	{
		var providerGroups = await Task.WhenAll(
			_providers.Select(async p =>
			{
				var allProviderDevices = await p.GetDevices(cancellationToken);
				var filteredDevices = allProviderDevices.Where(d => filter is null || filter(d)).ToList();
				return (Provider: p, DeviceIds: filteredDevices.Select(d => d.Id));
			})
		);

		var tasks = providerGroups.Select(
			async x => await x.Provider.SendCommand(x.DeviceIds, command, input, cancellationToken)
		);

		var results = (await Task.WhenAll(tasks)).SelectMany(x => x).ToList();

		return results;
	}

	public void Dispose()
	{
		foreach (var subscription in _subscriptions)
			subscription.Dispose();
	}
}

partial class Services
{
	private static IServiceCollection AddDeviceService(this IServiceCollection services) =>
		services.AddSingleton<IDeviceService, DeviceService>();
}
