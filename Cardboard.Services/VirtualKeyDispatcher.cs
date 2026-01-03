using Cardboard.Device;
using Cardboard.Events;
using Cardboard.Repositories;
using Cardboard.Utilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Cardboard.Services;

partial class Services
{
	private static IServiceCollection AddVirtualKeyDispatcher(this IServiceCollection services)
	{
		return services.AddHostedService<VirtualKeyDispatcher>();
	}
}

internal class VirtualKeyDispatcher(
	IAssociationEventService associationEventService,
	IInputEventService inputEventService,
	IDeviceService deviceService
) : IHostedService
{
	private readonly object _inputLock = new();
	private readonly VirtualKeyTrackers _trackers = new(deviceService);
	private volatile IReadOnlyList<VirtualKeyAssociation> _associations = [];
	private IDisposable? _associationSubscription;
	private IDisposable? _inputSubscription;

	// todo: track all virtual keys per device

	public Task StartAsync(CancellationToken cancellationToken)
	{
		_associationSubscription = associationEventService.OnActiveAssociationChanged.SubscribeAsync(
			OnAssociationChanged
		);

		return Task.CompletedTask;
	}

	public Task StopAsync(CancellationToken cancellationToken)
	{
		lock (_inputLock)
		{
			_inputSubscription?.Dispose();
			_inputSubscription = null;
		}

		_associationSubscription?.Dispose();

		return Task.CompletedTask;
	}

	private Task OnAssociationChanged(AssociationChangedEvent associationChangedEvent)
	{
		_associations = associationChangedEvent.Associations.SelectMany(x => x.Data.VirtualKeys).ToList();

		lock (_inputLock)
		{
			switch (_inputSubscription, _associations.Count)
			{
				case (null, > 0):
					_inputSubscription = inputEventService.OnInput.SubscribeAsync(OnInput);
					break;

				case ({ } sub, 0):
					sub.Dispose();
					_inputSubscription = null;
					break;
			}
		}

		return Task.CompletedTask;
	}

	private async Task OnInput(InputEvent inputEvent)
	{
		var associations = _associations.Where(x =>
			IsMatch(inputEvent.Device, inputEvent.Key, x.DeviceMatching)
		);
		await Task.WhenAll(associations.Select(async x => await UpdateDeviceVirtualKey(x, inputEvent)));
	}

	private async Task UpdateDeviceVirtualKey(VirtualKeyAssociation association, InputEvent inputEvent)
	{
		if (inputEvent.State == InputKeyState.PressAndRelease)
		{
			await UpdateDeviceVirtualKey(association, inputEvent with { State = InputKeyState.Press });
			await UpdateDeviceVirtualKey(association, inputEvent with { State = InputKeyState.Release });
			return;
		}

		var keyState = inputEvent.State switch
		{
			InputKeyState.Press => true,
			InputKeyState.Release => false,
			_ => throw new ArgumentOutOfRangeException(nameof(inputEvent), "Unsupported input key state."),
		};
		await _trackers.UpdateDevice(association.DeviceId, association.VirtualKey, keyState);
	}

	private static bool IsMatch(InputDeviceInfo inputDevice, InputKey key, VirtualKeyDeviceMatch match)
	{
		return match.InputKey == key
			&& IsStringMatch(inputDevice.Vid, match.Vid)
			&& IsStringMatch(inputDevice.Pid, match.Pid)
			&& IsStringMatch(inputDevice.Serial, match.Serial)
			&& IsStringMatch(inputDevice.Description, match.Description);

		static bool IsStringMatch(string value, string? match)
		{
			return match is null || value.Contains(match, StringComparison.OrdinalIgnoreCase);
		}
	}

	private class VirtualKeyTrackers(IDeviceService deviceService)
	{
		private readonly Dictionary<DeviceId, DeviceVirtualKeyTracker> _trackers = new();

		public async Task UpdateDevice(
			DeviceId deviceId,
			int keyIndex,
			bool state,
			CancellationToken cancellationToken = default
		)
		{
			if (!_trackers.TryGetValue(deviceId, out var tracker))
			{
				var deviceInfo = (await deviceService.GetDevices(cancellationToken)).FirstOrDefault(x =>
					x.Id == deviceId
				);

				if (deviceInfo is null)
					return; // device was not found... log?

				tracker = DeviceVirtualKeyTracker.FromDevice(deviceInfo);

				if (tracker is null)
					return; // device does not support virtual keys... log?

				_trackers.Add(deviceId, tracker);
			}

			tracker.UpdateKeyState(keyIndex, state);
			var result = await deviceService.SendCommand(
				tracker.Command,
				tracker.KeyStates,
				tracker.DeviceId,
				cancellationToken
			);

			if (!result.IsSuccess)
			{
				// todo: log error
			}
		}
	}

	private class DeviceVirtualKeyTracker(DeviceId deviceId, SetVirtualKeysCommand command)
	{
		private readonly bool[] _keyStates = new bool[command.NumberOfVirtualKeys];
		public IReadOnlyCollection<bool> KeyStates => _keyStates;

		public DeviceId DeviceId => deviceId;
		public SetVirtualKeysCommand Command => command;

		public void UpdateKeyState(int keyIndex, bool state)
		{
			if (keyIndex < 0 || keyIndex >= _keyStates.Length)
				throw new ArgumentOutOfRangeException(nameof(keyIndex), "Key index is out of range."); // todo: we might not want to throw here.... log instead?

			_keyStates[keyIndex] = state;
		}

		public static DeviceVirtualKeyTracker? FromDevice(DeviceInfo deviceInfo)
		{
			var cmd = SetVirtualKeysCommand.CreateFor(deviceInfo);

			if (cmd is null)
				return null;

			return new(deviceInfo.Id, cmd);
		}
	}
}
