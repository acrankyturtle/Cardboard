use core::{borrow::BorrowMut, fmt::Display};

use alloc::boxed::Box;
use alloc::vec::Vec;
use defmt::{error, info};
use rp2040_hal::usb::UsbBus;
use serde::{Deserialize, Serialize};
use usbd_serial::{embedded_io::Write, SerialPort};
use uuid::Uuid;

use crate::{
	device::{ContextDeviceInfo, ContextProfileStorage, ContextSerialPort},
	input::KeyId,
	Error,
};

pub struct Command<Context> {
	pub info: CommandInfo,
	execute_fn: fn(ctx: &mut Context) -> Result<(), Error>,
}

impl<'a, Context> Command<Context> {
	pub fn execute(&self, context: &'a mut Context) -> Result<(), Error> {
		(self.execute_fn)(context)
	}
}

pub fn identify_cmd<'a, Context: ContextDeviceInfo + ContextSerialPort<'a>>() -> Command<Context> {
	Command {
		info: CommandInfo {
			id: CommandId(Uuid::from_u128(0x4ec4198c_db56_5d30_9eb6_0de39356bbbc)),
			name: "Identify",
		},
		execute_fn: |ctx| {
			let device_info = ctx.get_device_info();

			let response = IdentifyResponse { info: device_info };
			let mut buf = [0u8; 256]; // todo: choose size

			if let Ok(len) = serde_json_core::to_slice(&response, &mut buf) {
				let len = len as u32;
				ctx.get_serial_port()
					.write_all(&len.to_le_bytes())
					.map_err(|_| Error::Unknown)?;
				ctx.get_serial_port()
					.write_all(&buf[..len as usize])
					.map_err(|_| Error::Unknown)?;
				Ok(())
			} else {
				Err(Error::Unknown)
			}
		},
	}
}

pub fn set_profile_cmd<
	'a,
	const PROF_SIZE: usize,
	Context: ContextProfileStorage<PROF_SIZE> + ContextSerialPort<'a>,
>() -> Command<Context> {
	Command {
		info: CommandInfo {
			id: CommandId(Uuid::from_u128(0x7439d220_c91f_50ca_ac7b_cf55a693a081)),
			name: "Set Keyboard Profile",
		},
		execute_fn: |ctx| {
			let mut len = ctx.get_serial_port().read_u16().ok_or(Error::Unknown)? as usize;

			if len == 0 {
				return Err(Error::Unknown);
			}

			// erase old profile (ensure erase multiple of 4096)
			let rem = len % 4096;
			let erase_len = if rem != 0 { len + (4096 - rem) } else { len };
			ctx.get_profile_storage().erase(0, erase_len)?;

			const BLOCK_SIZE: usize = 4 * 1024;
			let mut offset = 0;

			// write in blocks
			while len > 0 {
				let read_len = if len > BLOCK_SIZE { BLOCK_SIZE } else { len };
				let mut buf = [0u8; BLOCK_SIZE];
				let num_read = ctx
					.get_serial_port()
					.read(&mut buf[..read_len])
					.or(Err(Error::Unknown))?;

				if num_read != read_len {
					error!("Unexpected end of data");
					return Err(Error::Unknown);
				}

				let write_len = if read_len < BLOCK_SIZE {
					// ensure multiple of 256
					let rem = read_len % 256;
					if rem != 0 {
						let pad = 256 - rem;
						read_len + pad
					} else {
						read_len
					}
				} else {
					BLOCK_SIZE
				};
				ctx.get_profile_storage().write(offset, &buf[..write_len])?;

				len -= read_len;
				offset += read_len;
			}

			// indicate success
			ctx.get_serial_port()
				.write(&[0xFF])
				.map_err(|_| Error::Unknown)?;
			Ok(())
		},
	}
}

// impl<'a, Context> Command<Context> for IdentifyCommand
// where
// 	Context: ContextDeviceInfo + ContextSerialPort<'a> + 'a,
// {
// 	fn get_cmd_info(&self) -> CommandInfo {
// 		CommandInfo {
// 			id: CommandId(Uuid::from_u128(0x9ef5b286_c44f_51f4_97be_ecbcfb00a80f)),
// 			name: "Identify",
// 		}
// 	}

// 	fn execute(&mut self, ctx: &mut Context) -> Result<(), Error> {
// 		let response = IdentifyResponse {
// 			info: ctx.get_device_info(),
// 		};
// 		let mut buf = [0u8; 256]; // todo: choose size

// 		if let Ok(len) = serde_json_core::to_slice(&response, &mut buf) {
// 			let len = len as u32;
// 			ctx.get_serial_port()
// 				.write_all(&len.to_le_bytes())
// 				.map_err(|_| Error::Unknown)?;
// 			ctx.get_serial_port()
// 				.write_all(&buf[..len as usize])
// 				.map_err(|_| Error::Unknown)?;
// 			Ok(())
// 		} else {
// 			Err(Error::Unknown)
// 		}
// 	}
// }

// pub struct SetKeyboardProfileCommand<'a, const SIZE: usize> {
// 	pub storage: &'a mut FlashStorage<SIZE>,
// }

// impl<'a, const SIZE: usize, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> Command<RS, WS>
// 	for SetKeyboardProfileCommand<'a, SIZE>
// {
// 	fn get_cmd_info(&self) -> CommandInfo {
// 		CommandInfo {
// 			id: CommandId(Uuid::from_u128(0xe673c27a_c4a9_5d6f_a33c_4f1b7fe52afb)),
// 			name: "Set Keyboard Profile",
// 		}
// 	}

// 	fn execute(
// 		&mut self,
// 		serial_port: &mut SerialPort<'_, UsbBus, RS, WS>,
// 		response_buf: &mut [u8],
// 	) -> Result<Option<usize>, Error> {
// 		let mut len = serial_port.read_u16().ok_or(Error::Unknown)? as usize;

// 		if len == 0 {
// 			return Err(Error::Unknown);
// 		}

// 		const MAX_SIZE: usize = 4 * 1024;
// 		let mut offset = 0;

// 		while len > 0 {
// 			let read_len = if len > MAX_SIZE { MAX_SIZE } else { len };
// 			let mut buf = [0u8; MAX_SIZE];
// 			serial_port
// 				.read(&mut buf[..read_len])
// 				.or(Err(Error::Unknown))?;
// 			self.storage.write(offset, &buf);

// 			len -= read_len;
// 			offset += read_len;
// 		}

// 		response_buf[0] = 0xFF;
// 		Ok(Some(1))
// 	}
// }

// pub struct GetKeysCommand<'a> {
// 	pub keys: &'a [KeyId],
// }

// impl<'a, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> Command<RS, WS> for GetKeysCommand<'a> {
// 	fn get_cmd_info(&self) -> CommandInfo {
// 		CommandInfo {
// 			id: CommandId(Uuid::from_u128(0xcb920236_1f27_50c5_98c0_ff92367f330b)),
// 			name: "Get Keys",
// 		}
// 	}

// 	fn execute(
// 		&mut self,
// 		_: &mut SerialPort<'_, UsbBus, RS, WS>,
// 		response_buf: &mut [u8],
// 	) -> Result<Option<usize>, Error> {
// 		let response = GetKeysResponse { keys: self.keys };
// 		serde_json_core::to_slice(&response, response_buf)
// 			.map(Some)
// 			.map_err(|_| Error::Unknown)
// 	}
// }

#[derive(Serialize)]
pub struct IdentifyResponse<'a> {
	info: &'a DeviceInfo,
}

#[derive(Serialize)]
pub struct GetKeysResponse<'a> {
	keys: &'a [KeyId],
}

#[derive(Serialize)]
pub struct DeviceInfo {
	pub id: DeviceId,
	pub name: &'static str,
	pub manufacturer: &'static str,
	pub commands: Vec<CommandInfo>,
}

#[derive(Serialize, Copy, Clone)]
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

#[derive(Serialize, Deserialize, Copy, Clone)]
pub struct CommandId(Uuid);

pub struct CommandList<const N: usize, Context> {
	commands: [Command<Context>; N],
}

impl<'a, const N: usize, Context> CommandList<N, Context>
where
	Context: ContextSerialPort<'a>,
{
	pub fn new(commands: [Command<Context>; N]) -> Self {
		CommandList { commands }
	}

	pub fn run_command(&self, ctx: &mut Context) -> Result<(), Error> {
		let index = match ctx.get_serial_port().read_u8() {
			Some(index) => index as usize,
			None => {
				error!("Failed to read command index");
				return Err(Error::Unknown);
			}
		};

		let cmd = self.commands.get(index).ok_or_else(|| {
			error!("Command index {} not found", index);
			Error::Unknown
		})?;

		cmd.execute(ctx)
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
