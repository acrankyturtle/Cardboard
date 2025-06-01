use core::alloc::GlobalAlloc;

use crate::{
	TrackingAllocator,
	device::DeviceInfo,
	profile::{KeyboardProfile, LayerTag},
	serial::{SerialReader, SerialReaderExt, SerialWriter, SerialWriterExt},
	storage::FlashMemory,
};
use alloc::vec::Vec;

pub struct Context<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx + 'static,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader + 'static,
> {
	pub device_info: &'static DeviceInfo,
	pub profile_flash: ProfileFlash,
	pub change_profile_signal: &'static ChangeProfileSignal,
	pub serial_rx: SerialRx,
	pub serial_tx: SerialTx,
	pub external_tags_signal: &'static SetExternalTagsSignal,
	pub allocator: &'static TrackingAllocator<Allocator>,
	pub bootloader: &'static Bootloader,
}

impl<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
>
	Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
		Bootloader,
	>
{
	pub fn new(
		device_info: &'static DeviceInfo,
		profile_flash: ProfileFlash,
		change_profile_signal: &'static ChangeProfileSignal,
		serial_rx: SerialRx,
		serial_tx: SerialTx,
		external_tags_signal: &'static SetExternalTagsSignal,
		allocator: &'static TrackingAllocator<Allocator>,
		bootloader: &'static Bootloader,
	) -> Self {
		Self {
			device_info,
			profile_flash,
			change_profile_signal,
			serial_rx,
			serial_tx,
			external_tags_signal,
			allocator,
			bootloader,
		}
	}
}

pub trait ContextDeviceInfo {
	fn device_info(&self) -> &'static DeviceInfo;
}

pub trait ContextSerialRx {
	type SerialRx: SerialReader + SerialReaderExt;
	fn serial_rx(&mut self) -> &mut Self::SerialRx;
}

pub trait ContextSerialTx {
	type SerialTx: SerialWriter + SerialWriterExt;
	fn serial_tx(&mut self) -> &mut Self::SerialTx;
}

pub trait ContextProfile {
	type ProfileFlash: FlashMemory;
	fn profile_flash(&mut self) -> &mut Self::ProfileFlash;

	type ChangeProfileSignal: ChangeProfileSignalTx;
	fn profile_signal(&mut self) -> &Self::ChangeProfileSignal;
}

pub trait ContextTags {
	fn set_external_tags(&mut self, tags: Vec<LayerTag>);
}

pub trait ContextAllocator {
	fn allocator(&self) -> &TrackingAllocator<Self::A>;
	type A: GlobalAlloc;
}

pub trait ContextBootloader {
	fn reboot_to_bootloader(&mut self) -> !;
}

impl<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
> ContextDeviceInfo
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
		Bootloader,
	>
{
	fn device_info(&self) -> &'static DeviceInfo {
		self.device_info
	}
}

impl<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
> ContextSerialRx
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
		Bootloader,
	>
{
	type SerialRx = SerialRx;
	fn serial_rx(&mut self) -> &mut Self::SerialRx {
		&mut self.serial_rx
	}
}

impl<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
> ContextSerialTx
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
		Bootloader,
	>
{
	type SerialTx = SerialTx;
	fn serial_tx(&mut self) -> &mut Self::SerialTx {
		&mut self.serial_tx
	}
}

impl<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
> ContextProfile
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
		Bootloader,
	>
{
	type ProfileFlash = ProfileFlash;
	fn profile_flash(&mut self) -> &mut Self::ProfileFlash {
		&mut self.profile_flash
	}

	type ChangeProfileSignal = ChangeProfileSignal;
	fn profile_signal(&mut self) -> &Self::ChangeProfileSignal {
		self.change_profile_signal
	}
}

impl<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
> ContextTags
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
		Bootloader,
	>
{
	fn set_external_tags(&mut self, tags: Vec<LayerTag>) {
		self.external_tags_signal.set_external_tags(tags);
	}
}

impl<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
> ContextAllocator
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
		Bootloader,
	>
{
	fn allocator(&self) -> &TrackingAllocator<Self::A> {
		self.allocator
	}
	type A = Allocator;
}

impl<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
> ContextBootloader
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
		Bootloader,
	>
{
	fn reboot_to_bootloader(&mut self) -> ! {
		self.bootloader.reboot_to_bootloader()
	}
}

pub trait ChangeProfileSignalTx {
	fn change_profile(&self, profile: KeyboardProfile);
}

pub trait ChangeProfileSignalRx {
	fn try_get_changed_profile(&self) -> Option<KeyboardProfile>;
}

pub trait ExternalTagsSignalTx {
	fn set_external_tags(&self, tags: Vec<LayerTag>);
}

pub trait ExternalTagsSignalRx {
	fn try_get_external_tags(&self) -> Option<Vec<LayerTag>>;
}

pub trait RebootToBootloader {
	fn reboot_to_bootloader(&self) -> !;
}

pub trait WaitForSerialConnection {
	async fn wait_for_serial_connection(&mut self);
}
