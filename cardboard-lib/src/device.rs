use core::fmt::Display;

use alloc::{string::ToString, vec::Vec};
use defmt::Format;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::command::CommandInfo;

#[derive(Serialize, Deserialize, Copy, Clone, PartialEq)]
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
pub struct DeviceTypeId(Uuid);

impl DeviceTypeId {
	pub const fn new(id: Uuid) -> Self {
		DeviceTypeId(id)
	}
}

#[derive(Serialize, Deserialize, Copy, Clone, PartialEq)]
pub struct DeviceVersion(u32);

impl DeviceVersion {
	pub const fn new(version: u32) -> Self {
		DeviceVersion(version)
	}
}

#[derive(Serialize, Deserialize, Copy, Clone, PartialEq)]
pub struct DeviceVariant(u32);

impl DeviceVariant {
	pub const fn new(variant: u32) -> Self {
		DeviceVariant(variant)
	}
}

#[derive(Serialize, Deserialize, Copy, Clone, PartialEq)]
pub struct CommandId(pub Uuid);

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

#[derive(Serialize)]
pub struct DeviceInfo {
	pub id: DeviceId,
	pub name: &'static str,
	pub manufacturer: &'static str,
	pub r#type: DeviceTypeId,
	pub variant: DeviceVariant,
	pub version: DeviceVersion,
	pub commands: Vec<CommandInfo>,
}
