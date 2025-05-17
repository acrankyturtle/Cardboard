using System.Management;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using Cardboard.Windows;
using Cranky;
using Microsoft.Extensions.DependencyInjection;

namespace Cardboard.Serial.Windows;

public interface IWindowsSerialDeviceFinder
{
	IObservable<Unit> OnMaybeDevicesUpdated { get; }

	IReadOnlyCollection<SerialDeviceFound> GetDevices();
}

internal class WindowsSerialDeviceFinder : IWindowsSerialDeviceFinder, IDisposable
{
	private static readonly IReadOnlyCollection<UsbDeviceQuery> _devices = [new("F055", "6969"),];

	private readonly Subject<Unit> _devicesUpdatedSubject = new();
	private readonly IDisposable _subscription;

	private const int WM_DEVICECHANGE = 0x0219;

	public IObservable<Unit> OnMaybeDevicesUpdated => _devicesUpdatedSubject.AsObservable();

	private IReadOnlyCollection<SerialDeviceFound>? _cached = null;

	public WindowsSerialDeviceFinder(IWindowsService windowsService)
	{
		_subscription = windowsService
			.OnMessage
			.Where(x => x.Msg == WM_DEVICECHANGE)
			.Subscribe(_ =>
			{
				UpdateDevices();
				_devicesUpdatedSubject.OnNext(new());
			});
	}

	public IReadOnlyCollection<SerialDeviceFound> GetDevices() =>
		(_cached ??= ComPortFinder.GetUsbDeviceComPorts(_devices)) ?? [];

	private void UpdateDevices() => _cached = ComPortFinder.GetUsbDeviceComPorts(_devices) ?? _cached;

	public void Dispose()
	{
		_subscription.Dispose();
	}
}

public readonly record struct SerialDeviceFound(string ComPort);

public readonly record struct UsbDeviceQuery(string Vid, string Pid)
{
	internal static IEqualityComparer<UsbDeviceQuery> OrdinalIgnoreCaseComparer { get; } =
		new OrdinalIgnoreCaseEqualityComparer();

	private class OrdinalIgnoreCaseEqualityComparer : IEqualityComparer<UsbDeviceQuery>
	{
		public bool Equals(UsbDeviceQuery x, UsbDeviceQuery y) =>
			StringComparer.OrdinalIgnoreCase.Equals(x.Vid, y.Vid)
			&& StringComparer.OrdinalIgnoreCase.Equals(x.Pid, y.Pid);

		public int GetHashCode(UsbDeviceQuery obj) =>
			StringComparer.OrdinalIgnoreCase.GetHashCode(obj.Vid)
			^ StringComparer.OrdinalIgnoreCase.GetHashCode(obj.Pid);
	}
}

internal static class ComPortFinder
{
	public static IReadOnlyCollection<SerialDeviceFound>? GetUsbDeviceComPorts(
		IEnumerable<UsbDeviceQuery> devices
	)
	{
		var deviceSet = devices.ToHashSet(UsbDeviceQuery.OrdinalIgnoreCaseComparer);
		var query = GetObjectQuery(deviceSet);

		try
		{
			using var searcher = new ManagementObjectSearcher(query);
			var queryResult = searcher.Get();
			return queryResult
				.OfType<ManagementObject>()
				.Select(PnpDevice.TryFrom)
				.OfType<PnpDevice>()
				.Select(x =>
				{
					var comPort = GetComPortFromCaption(x.Caption);
					//var serialNumber = GetParentSerialNumber(x.DeviceId);

					if (
						string.IsNullOrEmpty(comPort) /*|| string.IsNullOrEmpty(serialNumber)*/
					)
						return (SerialDeviceFound?)null;

					return new SerialDeviceFound(comPort);
				})
				.OfType<SerialDeviceFound>()
				.ToList();
		}
		catch (InvalidCastException)
		{
			// idk why this happens, but we ignore it
			return null;
		}
		catch (Exception ex)
		{
			Console.WriteLine($"Error finding COM ports: {ex.Message}");
			return null;
		}
	}

	private static string GetObjectQuery(IEnumerable<UsbDeviceQuery> filters)
	{
		var whereClause = BuildWhereClause("PNPDeviceID", filters);
		return $"SELECT * FROM Win32_PnPEntity WHERE Caption LIKE '%(COM%' AND ({whereClause})";
	}

	private static string BuildWhereClause(string field, IEnumerable<UsbDeviceQuery> filters)
	{
		var conditions = filters
			.Select(f => $"({field} LIKE '%VID_{f.Vid.ToUpper()}&PID_{f.Pid.ToUpper()}%')")
			.ToList();

		return string.Join(" OR ", conditions);
	}

	private readonly record struct PnpDevice(string PnpDeviceId, string Caption, string DeviceId)
	{
		// private readonly (string Vid, string Pid) _vidPid = ParseVidPid(PnpDeviceId);
		//
		// public string Vid => _vidPid.Vid;
		// public string Pid => _vidPid.Pid;

		public static PnpDevice? TryFrom(ManagementObject device)
		{
			var pnpDeviceId = device["PNPDeviceID"]?.ToString();
			var caption = device["Caption"]?.ToString();
			var deviceId = device["DeviceID"]?.ToString();

			if (
				string.IsNullOrEmpty(pnpDeviceId)
				|| string.IsNullOrEmpty(caption)
				|| string.IsNullOrEmpty(deviceId)
			)
				return null;

			return new(pnpDeviceId, caption, deviceId);
		}

		// private static (string Vid, string Pid) ParseVidPid(string pnpDeviceId)
		// {
		// 	const string vidPrefix = "VID_";
		// 	const string pidPrefix = "PID_";
		// 	var vidStart = pnpDeviceId.IndexOf(vidPrefix, StringComparison.Ordinal);
		// 	var pidStart = pnpDeviceId.IndexOf(pidPrefix, StringComparison.Ordinal);
		//
		// 	if (vidStart < 0 || pidStart < 0)
		// 		// TODO: something?
		// 		return ("????", "????");
		//
		// 	vidStart += vidPrefix.Length;
		// 	pidStart += pidPrefix.Length;
		//
		// 	var vid = pnpDeviceId[vidStart..4];
		// 	var pid = pnpDeviceId[pidStart..4];
		//
		// 	return (vid, pid);
		// }
	}

	private static string? GetComPortFromCaption(string caption)
	{
		var startIndex = caption.IndexOf("(COM", StringComparison.Ordinal) + 1;
		if (startIndex <= 0) // or eq because we added one
			return null;

		var endIndex = caption.IndexOf(')', startIndex);
		if (endIndex < 0)
			return null;

		return caption.Substring(startIndex, endIndex - startIndex);
	}

	private static string? GetParentSerialNumber(string deviceId)
	{
		try
		{
			// Query Win32_USBControllerDevice to find the parent USB device
			var escapedDeviceId = deviceId.Replace(@"\", @"\\");
			var query =
				$"SELECT Antecedent FROM Win32_USBControllerDevice WHERE Dependent = @'Win32_PnPEntity.DeviceID=\"{escapedDeviceId}\"'";
			using var searcher = new ManagementObjectSearcher(query);

			foreach (var relation in searcher.Get().OfType<ManagementObject>())
			{
				// Get the Antecedent (parent USB device)
				var antecedent = relation["Antecedent"]?.ToString();
				if (string.IsNullOrEmpty(antecedent))
					continue;

				// Extract the DeviceID from the Antecedent path
				// e.g., Win32_USBHub.DeviceID="USB\\VID_F055&PID_6969\\D6875554-8CB4-5A57-B81F-70E91A6B7841"
				var antecedentSpan = antecedent.AsSpan();
				const string deviceIdPrefix = "DeviceID=\"";
				var startIndex = antecedentSpan.IndexOf(deviceIdPrefix);
				if (startIndex < 0)
					continue;
				startIndex += deviceIdPrefix.Length;

				var endIndex = antecedentSpan[startIndex..].IndexOf("\"", StringComparison.Ordinal);

				if (endIndex < 0)
					continue;

				var length = endIndex;

				var parentDeviceId = antecedentSpan[startIndex..length].ToString();

				// Query Win32_PnPEntity for the parent's PNPDeviceID
				var parentQuery =
					$"SELECT PNPDeviceID FROM Win32_PnPEntity WHERE DeviceID = '{parentDeviceId.Replace(@"\", @"\\")}'";
				using var parentSearcher = new ManagementObjectSearcher(parentQuery);

				foreach (var parentDevice in parentSearcher.Get().OfType<ManagementObject>())
				{
					var parentPnpDeviceId = parentDevice["PNPDeviceID"]?.ToString();
					if (string.IsNullOrEmpty(parentPnpDeviceId))
						continue;

					// Extract serial number from parent PNPDeviceID using span
					var parentPnpSpan = parentPnpDeviceId.AsSpan();
					var lastBackSlash = parentPnpSpan.LastIndexOf('\\');

					if (lastBackSlash == -1)
						continue;

					var serialNumber = parentPnpSpan[(lastBackSlash + 1)..].ToString();
					if (!string.IsNullOrEmpty(serialNumber))
					{
						return serialNumber;
					}
				}
			}
		}
		catch (Exception ex)
		{
			Console.WriteLine($"Error accessing parent serial number: {ex.Message}");
		}

		return null;
	}
}

public class WindowsSerialDeviceFinderOptions
{
	public IEnumerable<UsbDeviceQuery> Devices { get; set; } = [];
}

partial class Services
{
	private static IServiceCollection AddWindowsSerialDeviceFinder(this IServiceCollection services) =>
		services.AddSingleton<IWindowsSerialDeviceFinder, WindowsSerialDeviceFinder>();
}
