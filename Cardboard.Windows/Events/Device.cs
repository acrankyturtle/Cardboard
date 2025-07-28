// using System.Reactive.Subjects;
// using Cardboard.Device;
// using Microsoft.Extensions.DependencyInjection;
//
// namespace Cardboard.Windows;
//
// internal sealed class DeviceEventService : IDeviceEventService, IDisposable
// {
// 	private readonly IWindowsSerialDeviceFinder _deviceFinder;
// 	private readonly Subject<DeviceAddedEvent> _deviceAddedSubject = new();
// 	private readonly Subject<DeviceRemovedEvent> _deviceRemovedSubject = new();
//
// 	public IObservable<DeviceAddedEvent> OnDeviceAdded => _deviceAddedSubject;
// 	public IObservable<DeviceRemovedEvent> OnDeviceRemoved => _deviceRemovedSubject;
//
// 	private readonly IReadOnlyCollection<(DeviceInfo DeviceInfo, string ComPort)> _devices = [];
// 	private readonly IDisposable _deviceSubscription;
//
// 	public DeviceEventService(IWindowsSerialDeviceFinder deviceFinder)
// 	{
// 		_deviceFinder = deviceFinder;
// 		_deviceSubscription = deviceFinder.OnMaybeDevicesUpdated.Subscribe(_ => OnUpdate());
// 	}
//
// 	private void OnUpdate()
// 	{
// 		var oldItems = _devices;
// 		var newItems = _deviceFinder.GetDevices();
//
// 		var added = newItems
// 			.Where(newItem => oldItems.All(oldItem => oldItem.ComPort != newItem.ComPort))
// 			.Select(newItem => new DeviceAddedEvent(newItem));
// 	}
//
// 	public void Dispose()
// 	{
// 		_deviceSubscription.Dispose();
// 	}
// }
