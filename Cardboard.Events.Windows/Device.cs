// using System.Reactive.Subjects;
// using Cardboard.Device;
// using Cardboard.Serial.Windows;
// using Microsoft.Extensions.DependencyInjection;
//
// namespace Cardboard.Events.Windows;
//
// internal sealed class Device : IDeviceEventService, IDisposable
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
// 	public Device(IWindowsSerialDeviceFinder deviceFinder)
// 	{
// 		_deviceFinder = deviceFinder;
// 		_deviceSubscription = deviceFinder.OnMaybeDevicesUpdated.Subscribe(_ => OnUpdate());
// 	}
//
// 	private void OnUpdate()
// 	{
// 		var oldItems = _devices;
// 		var newItems = _deviceFinder.GetDevices();
// 	}
//
// 	public void Dispose()
// 	{
// 		_deviceSubscription.Dispose();
// 	}
// }
//
// partial class Services
// {
// 	private static IServiceCollection AddDeviceEvents(this IServiceCollection services) =>
// 		services.AddSingleton<IDeviceEventService, Device>();
// }
