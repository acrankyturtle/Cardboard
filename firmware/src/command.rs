use core::fmt::Display;

use alloc::{string::ToString, vec::Vec};
use defmt::{debug, error, info, Format};
use serde::{Deserialize, Serialize};
use uuid::{uuid, Uuid};

use crate::{
	context::{
		load_profile, write_profile_from_reader, ContextCurrentProfile, ContextDeviceInfo,
		ContextHidState, ContextProfileStorage, ContextSerialPort,
	},
	device::CommandInstance,
	input::KeyId,
	serial::SerialPort,
	Error,
};

pub trait Command<Context> {
	const INFO: CommandInfo;
	async fn execute(&mut self, ctx: &mut Context) -> Result<(), Error>;
}

pub struct IdentifyCommand;

impl Default for IdentifyCommand {
	fn default() -> Self {
		IdentifyCommand
	}
}

impl<Context> Command<Context> for IdentifyCommand
where
	Context: ContextDeviceInfo + ContextSerialPort,
{
	const INFO: CommandInfo = CommandInfo {
		id: CommandId(uuid!("ffffffff-ffff-ffff-ffff-ffffffffffff")),
		name: "Identify",
	};

	async fn execute(&mut self, ctx: &mut Context) -> Result<(), Error> {
		let device_info = ctx.get_device_info();

		let response = IdentifyResponse { info: device_info };
		let mut buf = [0u8; 256]; // todo: choose size

		if let Ok(len) = serde_json_core::to_slice(&response, &mut buf) {
			let len = len as u16;
			ctx.get_serial_port()
				.write(&len.to_le_bytes())
				.await
				.map_err(|_| Error::Unknown)?;
			ctx.get_serial_port()
				.write(&buf[..len as usize])
				.await
				.map_err(|_| Error::Unknown)?;
			Ok(())
		} else {
			Err(Error::Unknown)
		}
	}
}

pub struct SetProfileCommand;

impl Default for SetProfileCommand {
	fn default() -> Self {
		SetProfileCommand
	}
}

impl<Context> Command<Context> for SetProfileCommand
where
	Context: ContextProfileStorage + ContextCurrentProfile + ContextSerialPort + ContextHidState,
{
	const INFO: CommandInfo = CommandInfo {
		id: CommandId(uuid!("45963fd8-73e2-50a0-ba69-69c3333dd8af")),
		name: "Set Keyboard Profile",
	};

	async fn execute(&mut self, ctx: &mut Context) -> Result<(), Error> {
		let len = ctx.get_serial_port().read_u16().await.ok_or_else(|| {
			error!("Failed to read profile length");
			Error::Unknown
		})? as usize;

		debug!("Profile length: {}", len);

		write_profile_from_reader(len, ctx)?;

		load_profile(ctx)?;

		ctx.get_serial_port()
			.write(&[1])
			.await
			.map_err(|_| Error::Unknown)?;

		ctx.get_serial_port()
			.write(&[0xFF])
			.await
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



pub struct CommandList<const N: usize, Context> {
	commands: [CommandInstance<Context>; N],
}

impl<'a, const N: usize, Context> CommandList<N, Context>
where
	Context: ContextSerialPort,
{
	pub fn new(commands: [CommandInstance<Context>; N]) -> Self {
		CommandList { commands }
	}

	pub async fn run_command(&self, ctx: &mut Context) -> Result<(), Error> {
		let cmd_id = ctx.get_serial_port().read_uuid().await.ok_or_else(|| {
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
