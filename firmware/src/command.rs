use async_trait::async_trait;
use cardboard_lib::input::KeyId;
use defmt::debug;
use serde::Serialize;

use alloc::boxed::Box;
use uuid::uuid;

use crate::context::{
	ChangeProfileSignalTx, ContextDeviceInfo, ContextProfile, ContextSerialRx, ContextSerialTx,
};
use crate::device::{CommandId, DeviceInfo};
use crate::storage::{load_profile_from_flash, FlashMemory};
use cardboard_lib::serial::{SerialReader, SerialReaderExt, SerialWriter, SerialWriterExt};

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
			ctx.serial_tx().write_u16(len as u16).await?;
			ctx.serial_tx().write_exact(&buf[..len]).await?;
			Ok(())
		} else {
			Err("Failed to serialize response")
		}
	}
}

pub struct ChangeProfileCommand;

#[async_trait(?Send)]
impl<Context: ContextSerialRx + ContextSerialTx + ContextProfile> Command<Context>
	for ChangeProfileCommand
{
	fn info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(uuid!("45963fd8-73e2-50a0-ba69-69c3333dd8af")),
			name: "Set Keyboard Profile",
		}
	}

	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str> {
		const BUFFER_SIZE: usize = 256; // todo: tune

		let len = ctx
			.serial_rx()
			.read_u16()
			.await
			.ok_or("Failed to read profile length")? as usize;

		debug!("Profile length: {}", len);

		// clear profile flash storage
		ctx.profile_flash().erase_all()?;

		// write profile length to flash storage
		ctx.profile_flash().write(0, &(len as u16).to_le_bytes())?;
		const LENGTH_SIZE: usize = 2; // size of u16

		// read profile from serial port and write to flash storage in chunks
		let mut i = 0;
		let mut buf = [0; BUFFER_SIZE];
		while i < len {
			let size = (len - i).min(buf.len());
			let chunk = &mut buf[..size];
			ctx.serial_rx().read_exact(chunk).await?;

			debug!("Writing chunk: {} bytes", size);
			ctx.profile_flash().write(i + LENGTH_SIZE, chunk)?;
			i += size;
		}

		// deserialize profile from flash storage
		let profile = load_profile_from_flash(ctx.profile_flash())
			.map_err(|_| "Failed to load profile from flash storage")?;

		// signal profile changed
		ctx.profile_signal().change_profile(profile);

		// inform the host it was successful
		ctx.serial_tx().write_exact(&[0xFF]).await?;

		Ok(())
	}
}

pub struct SetLayerCommand;

pub struct VirtualKeyCommand;

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
