#![cfg_attr(not(test), no_std)]
#![feature(impl_trait_in_assoc_type)]
#![feature(generic_const_exprs)]

extern crate alloc;

use alloc::string::{String, ToString};

use cardboard_lib::device::DeviceId;

pub use static_cell::StaticCell;

pub mod rp2040;

static SERIAL_NUMBER: StaticCell<String> = StaticCell::new();

pub fn get_serial_number(device_id: &DeviceId) -> &'static str {
	SERIAL_NUMBER.init(device_id.to_string())
}

/// not intended for direct use -- this is used for macros
#[doc(hidden)]
pub mod __reexports {
	pub use cardboard_lib::TrackingAllocator;
	pub use cardboard_lib::command::{Command, CommandInfo};
	pub use cardboard_lib::embassy::{
		EmbassyFlashMemory, EmbassyKeypadHid, EmbassySerialPacketReader, EmbassySerialPacketWriter,
		EmbassyTickClock,
	};
	pub use cardboard_lib::hid::{HidDevice, HidReport};
	pub use cardboard_lib::input::{KeyId, KeyMatrix};
	pub use cardboard_lib::profile::{
		ConsumerControlEvent, GamepadEvent, KeyboardEvent, KeyboardProfile, LayerTag, MouseEvent,
	};
	pub use cardboard_lib::serial::BufferedReader;
	pub use cardboard_lib::settings::VersionedSettings;
	pub use cardboard_lib::tasks::{cmd_task, keypad_task};
	pub use cardboard_lib::time::Duration;
}
