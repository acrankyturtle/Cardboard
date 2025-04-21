use async_trait::async_trait;
use cardboard_lib::input::KeyId;
use serde::Serialize;

use alloc::boxed::Box;
use uuid::uuid;

use crate::context::{ContextDeviceInfo, ContextSerialTx};
use crate::device::{CommandId, DeviceInfo};
use crate::serial::SerialSender;

#[async_trait(?Send)]
pub trait Command<Context> {
	fn info(&self) -> CommandInfo;
	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str>
	where
		Context: 'async_trait;
}

pub struct IdentifyCommand;

#[async_trait(?Send)]
impl<Context: ContextDeviceInfo + ContextSerialTx> Command<Context> for IdentifyCommand {
	fn info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(uuid!("ffffffff-ffff-ffff-ffff-ffffffffffff")),
			name: "Identify",
		}
	}

	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str>
	where
		Context: 'async_trait,
	{
		let response = IdentifyResponse {
			info: ctx.device_info(),
		};
		let mut buf = [0u8; 256]; // todo: choose size

		if let Ok(len) = serde_json_core::to_slice(&response, &mut buf) {
			ctx.serial_tx()
				.write_exact(&len.to_le_bytes())
				.await
				.map_err(|_| "Endpoint error")?;
			ctx.serial_tx()
				.write_exact(&buf[..len])
				.await
				.map_err(|_| "Endpoint error")?;
			Ok(())
		} else {
			Err("Failed to serialize response")
		}
	}
}

// pub struct SetProfileCommand;

// #[async_trait(?Send)]
// impl<Context> Command<Context> for SetProfileCommand {
// 	fn info(&self) -> CommandInfo {
// 		CommandInfo {
// 			id: CommandId(uuid!("45963fd8-73e2-50a0-ba69-69c3333dd8af")),
// 			name: "Set Keyboard Profile",
// 		}
// 	}

// 	async fn execute(&mut self, ctx: &mut Context) -> Result<(), &'static str> {
// 		let len = self
// 			.serial_rx
// 			.read_u16()
// 			.await
// 			.ok_or("Failed to read profile length")? as usize;

// 		debug!("Profile length: {}", len);

// 		self.profile_storage.erase_all()?;

// 		// read profile from serial port and write to flash storage in chunks
// 		let mut i = 0;
// 		let mut buf = Receiver::create_buffer();
// 		while i < len {
// 			let size = (len - i).min(buf.len());
// 			let chunk = &mut buf[..size];
// 			self.profile_storage.write(i, chunk)?;
// 			i += size;
// 		}

// 		// read profile from flash storage
// 		let profile = KeyboardProfile::from_json_bytes(self.profile_storage.as_slice())?;
// 		// notify profile changed
// 		self.change_profile.send(profile).await;

// 		// inform the host it was successful
// 		self.serial_tx
// 			.write_packet(&[0xFF])
// 			.await
// 			.map_err(|_| "Endpoint error")?;

// 		Ok(())
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

#[derive(Serialize, Copy, Clone)]
pub struct CommandInfo {
	pub id: CommandId,
	pub name: &'static str,
}
