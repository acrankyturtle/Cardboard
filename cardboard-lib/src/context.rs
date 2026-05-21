use core::alloc::GlobalAlloc;

use crate::{
	TrackingAllocator,
	device::DeviceInfo,
	error::ErrorLog,
	profile::{KeyboardProfile, LayerTag},
	serial::SerialDrain,
	storage::{BlockFlash, BlockFlashExt, FlashPartition, PartitionedFlashMemory},
	stream::{ReadAsync, WriteAsync},
};
use alloc::boxed::Box;
use alloc::vec::Vec;
use async_trait::async_trait;


pub trait ContextDeviceInfo {
	fn device_info(&self) -> &'static DeviceInfo;
}

pub trait ContextSerialRx {
	type SerialRx: ReadAsync + SerialDrain;
	fn serial_rx(&mut self) -> &mut Self::SerialRx;
}

pub trait ContextSerialTx {
	type SerialTx: WriteAsync;
	fn serial_tx(&mut self) -> &mut Self::SerialTx;
}

pub trait ContextSettingsFlash {
	type Flash: BlockFlash;
	fn settings_flash(&mut self) -> PartitionedFlashMemory<Self::Flash>;
}

pub trait ContextProfileFlash {
	type Flash: BlockFlash;
	fn profile_flash(&mut self) -> PartitionedFlashMemory<Self::Flash>;
}

pub trait ContextUpdateProfile {
	type UpdateProfileSignal: UpdateProfileSignalTx + ?Sized;
	fn profile_signal(&mut self) -> &Self::UpdateProfileSignal;
}

pub trait ContextTags {
	fn set_external_tags(&mut self, tags: Vec<LayerTag>);
}

#[async_trait(?Send)]
pub trait ContextVirtualKeys<const VIRTUAL_KEY_BITFIELD_BYTES: usize> {
	async fn set_virtual_keys(&mut self, state: [u8; VIRTUAL_KEY_BITFIELD_BYTES]);
}

pub trait ContextAllocator {
	fn allocator(&self) -> &TrackingAllocator<Self::A>;
	type A: GlobalAlloc;
}

pub trait ContextReboot {
	fn reboot(&mut self) -> !;
	fn reboot_to_bootloader(&mut self) -> !;
}

pub trait ContextErrorLog {
	fn errors(&mut self) -> &mut Self::Errors;
	type Errors: ErrorLog;
}

pub trait ContextClock {
	fn clock(&self) -> &impl crate::time::Clock;
}

// Signal traits for inter-task communication

pub trait UpdateProfileSignalTx {
	fn update_profile(&self, profile: KeyboardProfile);
}

pub trait UpdateProfileSignalRx {
	fn try_get_changed_profile(&self) -> Option<KeyboardProfile>;
}

pub trait ExternalTagsSignalTx {
	fn set_external_tags(&self, tags: Vec<LayerTag>);
}

pub trait ExternalTagsSignalRx {
	fn try_get_external_tags(&self) -> Option<Vec<LayerTag>>;
}

#[async_trait(?Send)]
pub trait VirtualKeySignalTx<const SIZE: usize> {
	async fn set_virtual_keys(&self, state: [u8; SIZE]);
}

pub trait VirtualKeySignalRx<const SIZE: usize> {
	fn try_get_virtual_keys(&self) -> Option<[u8; SIZE]>;
}

pub trait Reboot {
	fn reboot(&mut self) -> !;
}

pub trait RebootToBootloader {
	fn reboot_to_bootloader(&self) -> !;
}

pub struct FlashStore<F: BlockFlash> {
	pub flash: F,
	pub settings_partition: FlashPartition<F>,
	pub profile_partition: FlashPartition<F>,
}

impl<F: BlockFlash> FlashStore<F> {
	pub fn new(
		flash: F,
		settings_partition: FlashPartition<F>,
		profile_partition: FlashPartition<F>,
	) -> Self {
		Self {
			flash,
			settings_partition,
			profile_partition,
		}
	}
}

impl<F: BlockFlash> ContextSettingsFlash for FlashStore<F> {
	type Flash = F;
	fn settings_flash(&mut self) -> PartitionedFlashMemory<F> {
		self.flash.partition(&self.settings_partition)
	}
}

impl<F: BlockFlash> ContextProfileFlash for FlashStore<F> {
	type Flash = F;
	fn profile_flash(&mut self) -> PartitionedFlashMemory<F> {
		self.flash.partition(&self.profile_partition)
	}
}

/// Bundles the reboot and reboot-to-bootloader handlers behind a single
/// `ContextReboot` impl.
pub struct RebootControl {
	pub reboot: &'static mut dyn Reboot,
	pub bootloader: &'static dyn RebootToBootloader,
}

impl RebootControl {
	pub fn new(
		reboot: &'static mut dyn Reboot,
		bootloader: &'static dyn RebootToBootloader,
	) -> Self {
		Self { reboot, bootloader }
	}
}

impl ContextReboot for RebootControl {
	fn reboot(&mut self) -> ! {
		self.reboot.reboot()
	}
	fn reboot_to_bootloader(&mut self) -> ! {
		self.bootloader.reboot_to_bootloader()
	}
}

// Declarative macros that emit boilerplate trait impls on a device's context
// struct, delegating to one of its fields. Each macro is opt-in; a device can
// always hand-write the impl when it needs custom behavior.

#[macro_export]
macro_rules! impl_context_device_info {
	($ty:ty, $field:ident) => {
		impl $crate::context::ContextDeviceInfo for $ty {
			fn device_info(&self) -> &'static $crate::device::DeviceInfo {
				self.$field
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_serial_rx {
	($ty:ty, $field:ident : $rx:ty) => {
		impl $crate::context::ContextSerialRx for $ty {
			type SerialRx = $rx;
			fn serial_rx(&mut self) -> &mut Self::SerialRx {
				&mut self.$field
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_serial_tx {
	($ty:ty, $field:ident : $tx:ty) => {
		impl $crate::context::ContextSerialTx for $ty {
			type SerialTx = $tx;
			fn serial_tx(&mut self) -> &mut Self::SerialTx {
				&mut self.$field
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_settings_flash {
	($ty:ty, $field:ident : $flash:ty) => {
		impl $crate::context::ContextSettingsFlash for $ty {
			type Flash = $flash;
			fn settings_flash(
				&mut self,
			) -> $crate::storage::PartitionedFlashMemory<'_, $flash> {
				$crate::context::ContextSettingsFlash::settings_flash(&mut self.$field)
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_profile_flash {
	($ty:ty, $field:ident : $flash:ty) => {
		impl $crate::context::ContextProfileFlash for $ty {
			type Flash = $flash;
			fn profile_flash(
				&mut self,
			) -> $crate::storage::PartitionedFlashMemory<'_, $flash> {
				$crate::context::ContextProfileFlash::profile_flash(&mut self.$field)
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_update_profile {
	($ty:ty, $field:ident) => {
		impl $crate::context::ContextUpdateProfile for $ty {
			type UpdateProfileSignal = dyn $crate::context::UpdateProfileSignalTx;
			fn profile_signal(&mut self) -> &Self::UpdateProfileSignal {
				self.$field
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_tags {
	($ty:ty, $field:ident) => {
		impl $crate::context::ContextTags for $ty {
			fn set_external_tags(
				&mut self,
				tags: ::alloc::vec::Vec<$crate::profile::LayerTag>,
			) {
				$crate::context::ExternalTagsSignalTx::set_external_tags(self.$field, tags);
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_virtual_keys {
	($ty:ty, $field:ident, $n:expr) => {
		#[::async_trait::async_trait(?Send)]
		impl $crate::context::ContextVirtualKeys<$n> for $ty {
			async fn set_virtual_keys(&mut self, state: [u8; $n]) {
				$crate::context::VirtualKeySignalTx::set_virtual_keys(self.$field, state).await;
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_allocator {
	($ty:ty, $field:ident : $alloc:ty) => {
		impl $crate::context::ContextAllocator for $ty {
			type A = $alloc;
			fn allocator(&self) -> &$crate::TrackingAllocator<Self::A> {
				self.$field
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_reboot {
	($ty:ty, $field:ident) => {
		impl $crate::context::ContextReboot for $ty {
			fn reboot(&mut self) -> ! {
				$crate::context::ContextReboot::reboot(&mut self.$field)
			}
			fn reboot_to_bootloader(&mut self) -> ! {
				$crate::context::ContextReboot::reboot_to_bootloader(&mut self.$field)
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_error_log {
	($ty:ty, $field:ident : $errors:ty) => {
		impl $crate::context::ContextErrorLog for $ty {
			type Errors = $errors;
			fn errors(&mut self) -> &mut Self::Errors {
				&mut self.$field
			}
		}
	};
}

#[macro_export]
macro_rules! impl_context_clock {
	($ty:ty, $field:ident) => {
		impl $crate::context::ContextClock for $ty {
			fn clock(&self) -> &impl $crate::time::Clock {
				self.$field
			}
		}
	};
}
