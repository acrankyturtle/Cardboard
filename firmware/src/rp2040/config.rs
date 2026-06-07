use cardboard_lib::{device::DeviceVariant, input::KeyId, settings::SettingsData, time::Duration};
use uuid::Uuid;

pub struct DeviceConfig<S, const ROWS: usize, const COLS: usize>
where
	[(); ROWS * COLS]:,
	S: SettingsData,
{
	pub device_type: Uuid,
	pub manufacturer: &'static str,
	pub model: &'static str,
	pub variant: Option<DeviceVariant>,
	pub key_ids: [KeyId; ROWS * COLS],
	pub bootloader_key_index: Option<usize>,
	pub mouse_enabled: fn(&S) -> bool,
	pub gamepad_enabled: fn(&S) -> bool,
	pub debounce_time: fn(&S) -> Duration,
	pub tick_interval: Duration,
	pub serial: SerialTimeouts,
	pub flash: FlashLayout,
}

impl<S, const ROWS: usize, const COLS: usize> DeviceConfig<S, ROWS, COLS>
where
	[(); ROWS * COLS]:,
	S: SettingsData,
{
	pub const fn bootloader_key(&self) -> Option<KeyId> {
		match self.bootloader_key_index {
			Some(i) => Some(self.key_ids[i]),
			None => None,
		}
	}
}

#[derive(Clone, Copy)]
pub struct SerialTimeouts {
	pub read: Duration,
	pub write: Duration,
	pub reset: Duration,
}

impl SerialTimeouts {
	pub const DEFAULTS: Self = SerialTimeouts {
		read: millis(100),
		write: secs(1),
		reset: secs(1),
	};
}

#[derive(Clone, Copy)]
pub struct FlashLayout {
	pub data_size: usize,
	pub settings_size: usize,
}

impl FlashLayout {
	pub const fn profile_size(&self) -> usize {
		self.data_size - self.settings_size
	}
}

pub const fn millis(ms: u64) -> Duration {
	Duration::from_ticks(ms * 1_000)
}

pub const fn secs(s: u64) -> Duration {
	Duration::from_ticks(s * 1_000_000)
}
