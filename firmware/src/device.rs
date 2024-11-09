use core::borrow::BorrowMut;

use rp2040_hal::usb::UsbBus;
use usbd_serial::SerialPort;

use crate::{
	command::{Command, CommandList, DeviceId, DeviceInfo},
	state::KeyboardState,
	storage::FlashStorage,
};

pub struct DeviceSetup<const C: usize, Context> {
	pub id: DeviceId,
	pub name: &'static str,
	pub manufacturer: &'static str,
	pub commands: [Command<Context>; C],
}

impl<'a, const C: usize, Context: ContextSerialPort<'a>> DeviceSetup<C, Context> {
	pub fn build(self) -> (DeviceInfo, CommandList<C, Context>) {
		(
			DeviceInfo {
				id: self.id,
				name: self.name,
				manufacturer: self.manufacturer,
				commands: self.commands.iter().map(|cmd| cmd.info).collect(),
			},
			CommandList::new(self.commands),
		)
	}
}

pub struct Device<'a, const PROF_SIZE: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> {
	pub device_info: DeviceInfo,
	pub serial_port: SerialPort<'a, UsbBus, RS, WS>,
	pub profile_storage: FlashStorage<PROF_SIZE>,
}

impl<'a, const PROF_SIZE: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> ContextDeviceInfo
	for Device<'a, PROF_SIZE, RS, WS>
{
	fn get_device_info(&self) -> &DeviceInfo {
		&self.device_info
	}
}

impl<'a, const PROF_SIZE: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>>
	ContextProfileStorage<PROF_SIZE> for Device<'a, PROF_SIZE, RS, WS>
{
	fn get_profile_storage(&mut self) -> &mut FlashStorage<PROF_SIZE> {
		&mut self.profile_storage
	}
}

impl<'a, const PROF_SIZE: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> ContextSerialPort<'a>
	for Device<'a, PROF_SIZE, RS, WS>
{
	fn get_serial_port(&mut self) -> &mut SerialPort<'a, UsbBus, Self::RS, Self::WS> {
		&mut self.serial_port
	}

	type RS = RS;
	type WS = WS;
}

pub trait ContextDeviceInfo {
	fn get_device_info(&self) -> &DeviceInfo;
}

pub trait ContextProfileStorage<const PROF_SIZE: usize> {
	fn get_profile_storage(&mut self) -> &mut FlashStorage<PROF_SIZE>;
}

pub trait ContextMacroState {
	fn get_macro_state(&mut self) -> &mut KeyboardState;
}

pub trait ContextSerialPort<'a> {
	fn get_serial_port(&mut self) -> &mut SerialPort<'a, UsbBus, Self::RS, Self::WS>;

	type RS: BorrowMut<[u8]>;
	type WS: BorrowMut<[u8]>;
}
