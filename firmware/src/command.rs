use async_trait::async_trait;
use cardboard_lib::input::KeyId;
use core::cmp::Ord;
use core::module_path;
use core::option_env;
use core::panic;
use core::result::Result;
use core::result::Result::Err;
use core::result::Result::Ok;
use defmt::{debug, error, info};
use serde::Serialize;

use alloc::boxed::Box;
use alloc::string::String;
use alloc::vec::Vec;
use uuid::uuid;

use crate::context::{
	ChangeProfileSignalTx, ContextDeviceInfo, ContextProfile, ContextSerialRx, ContextSerialTx,
	ContextTags, ExternalTagsSignalTx,
};
use crate::device::{CommandId, DeviceInfo};
use crate::profile::{KeyboardProfile, LayerTag};
use crate::storage::{load_profile_from_flash, FlashMemory};
use cardboard_lib::serial::{SerialReader, SerialReaderExt, SerialWriter, SerialWriterExt};

const CHUNK_SIZE: usize = 256; // todo: tune

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
		let mut buf = [0u8; 512]; // todo: tune size?

		if let Ok(len) = serde_json_core::to_slice(&response, &mut buf) {
			ctx.serial_tx().write_u16(len as u16).await?;
			ctx.serial_tx().write_exact(&buf[..len]).await?;
			Ok(())
		} else {
			Err("Failed to serialize response")
		}
	}
}

const SIZEOF_PROFILE_LENGTH: usize = 2; // size of u16

pub struct ChangeProfileCommand;

impl ChangeProfileCommand {
	async fn try_execute<Context: ContextSerialRx + ContextSerialTx + ContextProfile>(
		ctx: &mut Context,
	) -> Result<(), u8> {
		let len = ctx.serial_rx().read_u16().await.ok_or_else(|| {
			error!("Failed to read profile length");
			0x10u8
		})? as usize;

		debug!("Profile length: {}", len);

		// clear profile flash storage
		ctx.profile_flash().erase_all().or_else(|e| {
			error!("Failed to erase profile flash storage: {:?}", e);
			Err(0x20u8)
		})?;

		// write profile length to flash storage
		ctx.profile_flash()
			.write(0, &(len as u16).to_le_bytes())
			.or_else(|e| {
				error!("Failed to write profile length to flash storage: {:?}", e);
				Err(0x24u8)
			})?;

		// read profile from serial port and write to flash storage in chunks
		let mut i = 0;
		let mut buf = [0; CHUNK_SIZE];
		while i < len {
			let size = (len - i).min(buf.len());
			let chunk = &mut buf[..size];
			ctx.serial_rx().read_exact(chunk).await.or_else(|e| {
				error!("Failed to read profile chunk from serial port: {:?}", e);
				Err(0x14u8)
			})?;

			debug!("Writing chunk: {} bytes", size);
			ctx.profile_flash()
				.write(i + SIZEOF_PROFILE_LENGTH, chunk)
				.or_else(|e| {
					error!("Failed to write profile to flash storage: {:?}", e);
					Err(0x28u8)
				})?;
			i += size;
		}

		// deserialize profile from flash storage
		let profile = load_profile_from_flash(ctx.profile_flash()).map_err(|e| {
			error!("Failed to load profile from flash storage: {:?}", e);
			0x2C
		})?;

		// signal profile changed
		ctx.profile_signal().change_profile(profile);

		Ok(())
	}
}

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
		let result = Self::try_execute(ctx).await;

		let response = match result {
			Ok(_) => 0xFF,
			Err(code) => code,
		};

		ctx.serial_tx().write_u8(response).await.or_else(|e| {
			error!("Failed to write response to serial port: {:?}", e);
			Err("Failed to write response")
		})?;

		if result.is_ok() {
			Ok(())
		} else {
			Err("Failed to change profile")
		}
	}
}

pub struct GetProfileCommand;

#[async_trait(?Send)]
impl<Context: ContextSerialTx + ContextProfile> Command<Context> for GetProfileCommand {
	fn info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(uuid!("e8dfdb54-f01c-5f79-9bb7-7d8d0c0c82d1")),
			name: "Get Keyboard Profile",
		}
	}

	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str> {
		let is_valid = load_profile_from_flash(ctx.profile_flash()).is_ok();
		if is_valid {
			ctx.serial_tx().write_u8(0xFF).await?;

			let data = ctx.profile_flash().as_slice();
			let len = u16::from_le_bytes([data[0], data[1]]) as usize;
			ctx.serial_tx().write_u16(len as u16).await?;

			let mut profile_data = &data[SIZEOF_PROFILE_LENGTH..len + SIZEOF_PROFILE_LENGTH];

			// write profile to serial port in chunks
			while !profile_data.is_empty() {
				let size = profile_data.len().min(CHUNK_SIZE);
				ctx.serial_tx().write_exact(&profile_data[..size]).await?;
				profile_data = &profile_data[size..];
			}
		} else {
			ctx.serial_tx().write_u8(0x00).await?;
		}

		Ok(())
	}
}

pub struct SetExternalTagsCommand;

#[async_trait(?Send)]
impl<Context: ContextSerialRx + ContextSerialTx + ContextTags> Command<Context>
	for SetExternalTagsCommand
{
	fn info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(uuid!("6d84630b-03ec-57f7-806e-b1c5dee4974d")),
			name: "Set External Tags",
		}
	}

	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str> {
		let num_tags = ctx
			.serial_rx()
			.read_u8()
			.await
			.ok_or("Failed to read tags length")? as usize;

		debug!("Tags length: {}", num_tags);

		let mut tags = Vec::with_capacity(num_tags);

		for _ in 0..num_tags {
			let len = ctx
				.serial_rx()
				.read_u8()
				.await
				.ok_or("Failed to read tag length")?;

			if len == 0 {
				continue;
			}

			let mut buf = [0u8; 256];
			let buf = &mut buf[..len as usize];

			ctx.serial_rx().read_exact(buf).await?;

			let tag_str = core::str::from_utf8(buf).or(Err("Invalid UTF-8"))?;
			let tag = LayerTag::new(String::from(tag_str));

			tags.push(tag);
		}

		ctx.set_external_tags(tags);

		ctx.serial_tx().write_u8(0xFF).await?;

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
