use core::{borrow::BorrowMut, fmt::Display};

use alloc::boxed::Box;
use alloc::vec::Vec;
use defmt::{error, info};
use rp2040_hal::usb::UsbBus;
use serde::{Deserialize, Serialize};
use usbd_serial::{embedded_io::Write, SerialPort};
use uuid::Uuid;

use crate::{
	device::DeviceContext,
	serial::{SerialReadBufferStore, SerialWriteBufferStore},
};

pub trait Command<RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> {
	fn execute(
		&self,
		context: &mut DeviceContext<RS, WS>,
		response_buf: &mut [u8],
	) -> Option<usize>;
	fn get_cmd_info(&self) -> CommandInfo;
}

pub struct CommandList<const N: usize, RS = SerialReadBufferStore, WS = SerialWriteBufferStore>
where
	RS: BorrowMut<[u8]>,
	WS: BorrowMut<[u8]>,
{
	pub commands: [Box<dyn Command<RS, WS>>; N],
}

impl<const N: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> CommandList<N, RS, WS> {
	pub fn new(commands: [Box<dyn Command<RS, WS>>; N]) -> Self {
		CommandList { commands }
	}

	pub fn run_command(&self, context: &mut DeviceContext<RS, WS>) -> Option<()> {
		let index = match context.serial_port.read_u8() {
			Some(index) => index as usize,
			None => {
				error!("Failed to read command index");
				return None;
			}
		};

		let cmd = match self.commands.get(index) {
			Some(cmd) => cmd,
			None => {
				error!("Command index {} not found", index);
				return None;
			}
		};

		let mut response_buf = [0u8; 256];
		match cmd.execute(context, &mut response_buf) {
			Some(len) => match Self::send_response(&response_buf[..len], context.serial_port) {
				Some(_) => {
					info!(
						"Command `{}` executed successfully",
						cmd.get_cmd_info().name
					);
					Some(())
				}
				None => {
					error!("Failed to send response");
					None
				}
			},
			None => {
				error!("Failed to execute command `{}`", cmd.get_cmd_info().name);
				None
			}
		}

		// match port.flush() {
		// 	Ok(_) => Some(()),
		// 	Err(err) => {
		// 		error!("Failed to flush serial port {:?}", err);
		// 		None
		// 	}
	}

	fn send_response(buf: &[u8], port: &mut SerialPort<'_, UsbBus, RS, WS>) -> Option<()> {
		let len = buf.len();
		port.write_all(&len.to_le_bytes()).ok()?;
		port.write_all(buf).ok()?;
		Some(())
	}
}

#[derive(Serialize)]
pub struct IdentifyCommand {}

#[derive(Serialize)]
pub struct IdentifyResponse<'a> {
	info: &'a DeviceInfo,
}

impl IdentifyCommand {
	pub fn new() -> Self {
		IdentifyCommand {}
	}
}

impl<RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> Command<RS, WS> for IdentifyCommand {
	fn execute(&self, context: &mut DeviceContext<RS, WS>, response_buf: &mut [u8]) -> Option<usize> {
		let response = IdentifyResponse {
			info: &context.device_info,
		};
		serde_json_core::to_slice(&response, response_buf).ok()
	}

	fn get_cmd_info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(Uuid::parse_str("9ef5b286-c44f-51f4-97be-ecbcfb00a80f").unwrap()),
			name: "Identify",
		}
	}
}

#[derive(Serialize, Deserialize)]
pub struct DeviceInfo {
	pub id: DeviceId,
	pub name: &'static str,
	pub manufacturer: &'static str,
	pub commands: Vec<CommandInfo>,
}

#[derive(Serialize, Deserialize)]
pub struct CommandInfo {
	id: CommandId,
	name: &'static str,
}

#[derive(Copy, Clone, Serialize, Deserialize)]
pub struct DeviceId(Uuid);

impl DeviceId {
	pub const fn new(id: Uuid) -> Self {
		DeviceId(id)
	}
}

impl Display for DeviceId {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		self.0.fmt(f)
	}
}

#[derive(Serialize, Deserialize)]
pub struct CommandId(Uuid);

trait ReadExt {
	fn read_u8(&mut self) -> Option<u8>;

	fn read_u32(&mut self) -> Option<u32>;

	fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str>;
}

impl<RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> ReadExt for SerialPort<'_, UsbBus, RS, WS> {
	fn read_u8(&mut self) -> Option<u8> {
		let mut buf = [0];
		self.read(&mut buf).ok()?;
		Some(buf[0])
	}

	fn read_u32(&mut self) -> Option<u32> {
		let mut buf = [0, 0, 0, 0];
		self.read(&mut buf).ok()?;
		Some(u32::from_le_bytes(buf))
	}

	fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str> {
		self.read(buf).ok()?;
		core::str::from_utf8(buf).ok()
	}
}
