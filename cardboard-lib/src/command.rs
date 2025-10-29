use crate::context::ContextClock;
use crate::context::ContextErrorLog;
use crate::error::Error;
use crate::error::ErrorLog;
use crate::input::KeyId;
use crate::time::Clock;
use async_trait::async_trait;
use core::cmp::Ord;
use core::module_path;
use core::option_env;
use core::panic;
use core::result::Result;
use core::result::Result::Err;
use core::result::Result::Ok;
use defmt::{debug, error};
use serde::Serialize;

use alloc::boxed::Box;
use alloc::string::String;
use alloc::vec::Vec;
use uuid::uuid;

use crate::context::{
	ChangeProfileSignalTx, ContextDeviceInfo, ContextProfile, ContextSerialRx, ContextSerialTx,
	ContextTags, ContextVirtualKeys,
};
use crate::context::{ContextAllocator, ContextBootloader};
use crate::device::{CommandId, DeviceInfo};
use crate::profile::LayerTag;
use crate::storage::{FlashMemory, load_profile_from_flash};
use crate::stream::{Read, ReadExt, Write, WriteExt};

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
		let mut buf = [0u8; 1024]; // todo: tune size?

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

pub struct EnterBootloaderCommand;

#[async_trait(?Send)]
impl<Context: ContextBootloader> Command<Context> for EnterBootloaderCommand {
	fn info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(uuid!("6dce0823-d199-5abb-a56f-a85cdba61842")),
			name: "Enter Bootloader",
		}
	}

	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str> {
		ctx.reboot_to_bootloader();
	}
}

pub struct GetStatusCommand;

#[async_trait(?Send)]
impl<Context: ContextSerialTx + ContextAllocator + ContextClock + ContextErrorLog> Command<Context>
	for GetStatusCommand
{
	fn info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(uuid!("b14aadb5-53a2-5e69-b463-603efce7c199")),
			name: "Get Status",
		}
	}

	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str> {
		let allocator_current = ctx.allocator().current();
		let allocator_max = ctx.allocator().max();

		let response = StatusResponse {
			now: ctx.clock().now().ticks(),
			allocator_current,
			allocator_max,
			errors: ctx.errors().get_errors().collect(),
		};

		let mut buf = [0u8; 512]; // todo: tune size?
		let serialize_res = serde_json_core::to_slice(&response, &mut buf);

		match serialize_res {
			Ok(len) => {
				ctx.serial_tx().write_u16(len as u16).await?;
				ctx.serial_tx().write_exact(&buf[..len]).await?;
				Ok(())
			}
			Err(e) => match e {
				serde_json_core::ser::Error::BufferFull { .. } => {
					Err("Failed to serialize response: buffer too small")
				}
				_ => Err("Failed to serialize response"),
			},
		}
	}
}

pub struct SetVirtualKeysCommand<const VIRTUAL_KEY_BITFIELD_BYTES: usize>
where
	[(); VIRTUAL_KEY_BITFIELD_BYTES]:;

impl<const VIRTUAL_KEY_BITFIELD_BYTES: usize> SetVirtualKeysCommand<VIRTUAL_KEY_BITFIELD_BYTES>
where
	[(); VIRTUAL_KEY_BITFIELD_BYTES]:,
{
	async fn execute<
		Context: ContextSerialRx + ContextSerialTx + ContextVirtualKeys<VIRTUAL_KEY_BITFIELD_BYTES>,
	>(
		&self,
		ctx: &mut Context,
	) -> Result<(), &'static str> {
		let mut buffer = [0u8; VIRTUAL_KEY_BITFIELD_BYTES];
		ctx.serial_rx().read_exact(&mut buffer).await?;
		ctx.set_virtual_keys(buffer);
		Ok(())
	}
}

#[async_trait(?Send)]
impl<Context> Command<Context> for SetVirtualKeysCommand<1>
where
	Context: ContextSerialRx + ContextSerialTx + ContextVirtualKeys<1>,
{
	fn info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(uuid!("162d99cc-5e8f-5879-97fc-c37fdb0f22a9")),
			name: "Set Virtual Key (8 keys)",
		}
	}

	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str> {
		self.execute(ctx).await
	}
}

#[async_trait(?Send)]
impl<Context> Command<Context> for SetVirtualKeysCommand<4>
where
	Context: ContextSerialRx + ContextSerialTx + ContextVirtualKeys<4>,
{
	fn info(&self) -> CommandInfo {
		CommandInfo {
			id: CommandId(uuid!("c1b2d3e4-f5a6-7b8c-9d0e-f1a2b3c4d5e6")),
			name: "Set Virtual Key (32 keys)",
		}
	}

	async fn execute(&self, ctx: &mut Context) -> Result<(), &'static str> {
		self.execute(ctx).await
	}
}

#[derive(Serialize)]
struct StatusResponse<'a> {
	pub now: u64,
	pub allocator_current: usize,
	pub allocator_max: usize,
	pub errors: Vec<&'a Error>,
}

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
	// TODO: add fingerprint boolean (if true, command must write id after cmd index to confirm command execution)
}
