use core::{borrow::BorrowMut, fmt::Display};

use alloc::{string::ToString, vec::Vec};
use defmt::{debug, error, info, Format};
use rp2040_hal::usb::UsbBus;
use serde::{Deserialize, Serialize};
use usbd_serial::{embedded_io::Write, SerialPort};
use uuid::{uuid, Uuid};

use crate::{
	context::{
		load_profile, write_profile_from_reader, ContextCurrentProfile, ContextDeviceInfo,
		ContextHidState, ContextProfileStorage, ContextSerialPort,
	},
	device::CommandInstance,
	input::KeyId,
	Error,
};

pub trait Command<Context> {
	const INFO: CommandInfo;
	fn execute(ctx: &mut Context) -> Result<(), Error>;
	fn instance() -> CommandInstance<Context> {
		CommandInstance {
			info: Self::INFO,
			execute: Self::execute,
		}
	}
}

pub struct IdentifyCommand;

impl<'a, Context> Command<Context> for IdentifyCommand
where
	Context: ContextDeviceInfo + ContextSerialPort<'a>,
{
	const INFO: CommandInfo = CommandInfo {
		id: CommandId(uuid!("ffffffff-ffff-ffff-ffff-ffffffffffff")),
		name: "Identify",
	};

	fn execute(ctx: &mut Context) -> Result<(), Error> {
		let device_info = ctx.get_device_info();

		let response = IdentifyResponse { info: device_info };
		let mut buf = [0u8; 256]; // todo: choose size

		if let Ok(len) = serde_json_core::to_slice(&response, &mut buf) {
			let len = len as u16;
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
	}
}

pub struct SetProfileCommand;

impl<'a, Context> Command<Context> for SetProfileCommand
where
	Context:
		ContextProfileStorage + ContextCurrentProfile + ContextSerialPort<'a> + ContextHidState,
{
	const INFO: CommandInfo = CommandInfo {
		id: CommandId(uuid!("45963fd8-73e2-50a0-ba69-69c3333dd8af")),
		name: "Set Keyboard Profile",
	};

	fn execute(ctx: &mut Context) -> Result<(), Error> {
		let len = ctx.get_serial_port().read_u16().ok_or_else(|| {
			error!("Failed to read profile length");
			Error::Unknown
		})? as usize;

		debug!("Profile length: {}", len);

		write_profile_from_reader(len, ctx)?;

		load_profile(ctx)?;

		ctx.get_serial_port()
			.write(&[1])
			.map_err(|_| Error::Unknown)?;

		ctx.get_serial_port()
			.write(&[0xFF])
			.map_err(|_| Error::Unknown)?;

		Ok(())
	}
}

pub enum SetProfileCommandError {}

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

#[derive(Serialize, Deserialize, Copy, Clone, PartialEq)]
pub struct CommandId(Uuid);

impl Display for CommandId {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		self.0.fmt(f)
	}
}

impl Format for CommandId {
	fn format(&self, fmt: defmt::Formatter) {
		self.0.to_string().format(fmt);
	}
}

pub struct CommandList<const N: usize, Context> {
	commands: [CommandInstance<Context>; N],
}

impl<'a, const N: usize, Context> CommandList<N, Context>
where
	Context: ContextSerialPort<'a>,
{
	pub fn new(commands: [CommandInstance<Context>; N]) -> Self {
		CommandList { commands }
	}

	pub fn run_command(&self, ctx: &mut Context) -> Result<(), Error> {
		let cmd_id = ctx.get_serial_port().read_uuid().ok_or_else(|| {
			error!("Failed to read command index");
			Error::Unknown
		})?;
		let cmd_id = CommandId(cmd_id);

		info!("Command id: {:x}", cmd_id);

		let cmd = self
			.commands
			.iter()
			.find(|cmd| cmd.info.id == cmd_id)
			.ok_or_else(|| {
				error!("Command id {:x} not found", cmd_id);
				Error::Unknown
			})?;

		info!("Boutta do {}", cmd.info.name);

		(cmd.execute)(ctx)
	}
}

pub trait Reader {
	fn read(&mut self, buf: &mut [u8]) -> Result<(), Error>;

	fn read_u8(&mut self) -> Option<u8> {
		let mut buf = [0];
		self.read(&mut buf).ok()?;
		Some(buf[0])
	}
	fn read_u16(&mut self) -> Option<u32> {
		let mut buf = [0; 2];
		self.read(&mut buf).ok()?;
		Some(u16::from_le_bytes(buf) as u32)
	}

	fn read_u32(&mut self) -> Option<u32> {
		let mut buf = [0; 4];
		self.read(&mut buf).ok()?;
		Some(u32::from_le_bytes(buf))
	}

	fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str> {
		self.read(buf).ok()?;
		core::str::from_utf8(buf).ok()
	}

	fn read_uuid(&mut self) -> Option<Uuid> {
		let mut buf = [0; 16];
		self.read(&mut buf).ok()?;
		Uuid::from_slice_le(&buf).ok()
	}
}

impl<RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> Reader for SerialPort<'_, UsbBus, RS, WS> {
	fn read(&mut self, buf: &mut [u8]) -> Result<(), Error> {
		let mut offset = 0;
		while offset < buf.len() {
			let len = self.read(&mut buf[offset..]).map_err(|_| Error::Unknown)?;
			offset += len;
		}
		Ok(())
	}
}
