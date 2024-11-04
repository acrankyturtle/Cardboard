use core::borrow::BorrowMut;

use alloc::boxed::Box;
use rp2040_hal::usb::UsbBus;
use usbd_serial::SerialPort;

use crate::{
	command::{Command, CommandList, DeviceId, DeviceInfo},
	state::KeyboardState,
};

pub struct DeviceSetup<const C: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> {
	pub id: DeviceId,
	pub name: &'static str,
	pub manufacturer: &'static str,
	pub commands: [Box<dyn Command<RS, WS>>; C],
}

impl<const C: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> DeviceSetup<C, RS, WS> {
	pub fn build(self) -> (DeviceInfo, CommandList<C, RS, WS>) {
		(
			DeviceInfo {
				id: self.id,
				name: self.name,
				manufacturer: self.manufacturer,
				commands: self.commands.iter().map(|cmd| cmd.get_cmd_info()).collect(),
			},
			CommandList::new(self.commands),
		)
	}
}

pub struct DeviceContext<'a, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> {
	pub device_info: DeviceInfo,
	pub macro_state: KeyboardState<'a>,
	pub serial_port: &'a mut SerialPort<'a, UsbBus, RS, WS>,
}
