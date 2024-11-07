use core::{borrow::BorrowMut, fmt::Display};

use alloc::vec::Vec;
use defmt::{error, info};
use rp2040_hal::usb::UsbBus;
use serde::{Deserialize, Serialize};
use usbd_serial::{embedded_io::Write, SerialPort};
use uuid::Uuid;

use crate::{
	input::KeyId,
	serial::{SerialReadBufferStore, SerialWriteBufferStore},
	storage::FlashStorage,
	Error,
};

pub trait Command<RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> {
	fn get_cmd_info(&self) -> CommandInfo;

	fn execute(
		&mut self,
		serial_port: &mut SerialPort<'_, UsbBus, RS, WS>,
		response_buf: &mut [u8],
	) -> Result<Option<usize>, Error>;
}

pub struct IdentifyCommand {}

impl<RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> Command<RS, WS> for IdentifyCommand {
	fn get_cmd_info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(Uuid::from_u128(0x9ef5b286_c44f_51f4_97be_ecbcfb00a80f)),
			name: "Identify",
		}
	}

	fn execute(
		&mut self,
		_: &mut SerialPort<'_, UsbBus, RS, WS>,
		_: &mut [u8],
	) -> Result<Option<usize>, Error> {
		panic!("IdentifyCommand should not be executed directly");
	}
}

pub struct SetKeyboardProfileCommand<'a, const SIZE: usize> {
	pub storage: &'a mut FlashStorage<SIZE>,
}

impl<'a, const SIZE: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> Command<RS, WS>
	for SetKeyboardProfileCommand<'a, SIZE>
{
	fn get_cmd_info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(Uuid::from_u128(0xe673c27a_c4a9_5d6f_a33c_4f1b7fe52afb)),
			name: "Set Keyboard Profile",
		}
	}

	fn execute(
		&mut self,
		serial_port: &mut SerialPort<'_, UsbBus, RS, WS>,
		response_buf: &mut [u8],
	) -> Result<Option<usize>, Error> {
		let mut len = serial_port.read_u16().ok_or(Error::Unknown)? as usize;

		if len == 0 {
			return Err(Error::Unknown);
		}

		const MAX_SIZE: usize = 4 * 1024;
		let mut offset = 0;

		while len > 0 {
			let read_len = if len > MAX_SIZE { MAX_SIZE } else { len };
			let mut buf = [0u8; MAX_SIZE];
			serial_port
				.read(&mut buf[..read_len])
				.or(Err(Error::Unknown))?;
			self.storage.write(offset, &buf);

			len -= read_len;
			offset += read_len;
		}

		response_buf[0] = 0xFF;
		Ok(Some(1))
	}
}

pub struct GetKeysCommand<'a> {
	pub keys: &'a [KeyId],
}

impl<'a, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> Command<RS, WS> for GetKeysCommand<'a> {
	fn get_cmd_info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(Uuid::from_u128(0xcb920236_1f27_50c5_98c0_ff92367f330b)),
			name: "Get Keys",
		}
	}

	fn execute(
		&mut self,
		_: &mut SerialPort<'_, UsbBus, RS, WS>,
		response_buf: &mut [u8],
	) -> Result<Option<usize>, Error> {
		let response = GetKeysResponse { keys: self.keys };
		serde_json_core::to_slice(&response, response_buf)
			.map(Some)
			.map_err(|_| Error::Unknown)
	}
}

#[derive(Serialize)]
pub struct IdentifyResponse<'a> {
	info: &'a DeviceInfo,
}

#[derive(Serialize)]
pub struct GetKeysResponse<'a> {
	keys: &'a [KeyId],
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

pub struct CommandList<'a, const N: usize, RS = SerialReadBufferStore, WS = SerialWriteBufferStore>
where
	RS: BorrowMut<[u8]>,
	WS: BorrowMut<[u8]>,
{
	commands: [&'a mut dyn Command<RS, WS>; N],
	device_info: &'a DeviceInfo,
}

impl<'a, const N: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> CommandList<'a, N, RS, WS> {
	pub fn new(commands: [&'a mut dyn Command<RS, WS>; N], device_info: &'a DeviceInfo) -> Self {
		CommandList {
			commands,
			device_info,
		}
	}

	pub fn run_command(
		&self,
		serial_port: &mut SerialPort<'_, UsbBus, RS, WS>,
	) -> Result<(), Error> {
		let index = match serial_port.read_u8() {
			Some(index) => index as usize,
			None => {
				error!("Failed to read command index");
				return Err(Error::Unknown);
			}
		};

		let mut response_buf = [0u8; 256];
		let response_size = if index == 0 {
			// identify command
			let response = IdentifyResponse {
				info: self.device_info,
			};
			Some(
				serde_json_core::to_slice(&response, &mut response_buf)
					.map_err(|_| Error::Unknown)?,
			)
		} else {
			// cmd
			let mut cmd = match self.commands.get(index) {
				Some(cmd) => **cmd,
				None => {
					error!("Command index {} not found", index);
					return Err(Error::Unknown);
				}
			};

			match cmd.execute(serial_port, &mut response_buf) {
				Ok(Some(len)) => Some(len),
				Ok(None) => None,
				Err(_) => return Err(Error::Unknown),
			}
		};

		if let Some(len) = response_size {
			match Self::send_response(&response_buf[..len], serial_port) {
				Ok(_) => {
					info!(
						"Command `{}` executed successfully",
						self.commands[index].get_cmd_info().name
					);
					Ok(())
				}
				Err(_) => {
					error!("Failed to send response");
					Err(Error::Unknown)
				}
			}
		} else {
			info!(
				"Command `{}` executed successfully",
				self.commands[index].get_cmd_info().name
			);
			Ok(())
		}
	}

	fn send_response(buf: &[u8], port: &mut SerialPort<'_, UsbBus, RS, WS>) -> Result<(), ()> {
		let len = buf.len();
		port.write_all(&len.to_le_bytes()).map_err(|_| ())?;
		port.write_all(buf).map_err(|_| ())?;
		Ok(())
	}
}

trait ReadExt {
	fn read_u8(&mut self) -> Option<u8>;

	fn read_u16(&mut self) -> Option<u32>;

	fn read_u32(&mut self) -> Option<u32>;

	fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str>;
}

impl<RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> ReadExt for SerialPort<'_, UsbBus, RS, WS> {
	fn read_u8(&mut self) -> Option<u8> {
		let mut buf = [0];
		self.read(&mut buf).ok()?;
		Some(buf[0])
	}
	fn read_u16(&mut self) -> Option<u32> {
		let mut buf = [0, 0];
		self.read(&mut buf).ok()?;
		Some(u16::from_le_bytes(buf) as u32)
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
