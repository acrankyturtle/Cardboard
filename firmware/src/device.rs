use core::borrow::BorrowMut;

use alloc::boxed::Box;
use rp2040_hal::usb::UsbBus;
use usbd_serial::SerialPort;

use crate::{
	command::{Command, CommandList, DeviceId, DeviceInfo},
	state::KeyboardState,
};

pub struct DeviceSetup<'a, const C: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> {
	pub id: DeviceId,
	pub name: &'static str,
	pub manufacturer: &'static str,
	pub commands: [&'a dyn Command<RS, WS>; C],
}

impl<'a, const C: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> DeviceSetup<'a, C, RS, WS> {
	pub fn build_device_info(&self) -> DeviceInfo {
		DeviceInfo {
			id: self.id,
			name: self.name,
			manufacturer: self.manufacturer,
			commands: self.commands.iter().map(|cmd| cmd.get_cmd_info()).collect(),
		}
	}

	pub fn build_command_list(&self, device_info: &'a DeviceInfo) -> CommandList<'a, C, RS, WS> {
		CommandList::new(self.commands, device_info)
	}
}
