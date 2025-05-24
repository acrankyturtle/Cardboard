use core::alloc::GlobalAlloc;

use crate::{
	device::DeviceInfo,
	profile::{KeyboardProfile, LayerTag},
	storage::FlashMemory,
	TrackingAllocator,
};
use alloc::vec::Vec;
use cardboard_lib::serial::{SerialReader, SerialReaderExt, SerialWriter, SerialWriterExt};
use embassy_sync::{blocking_mutex::raw::RawMutex, signal::Signal};

pub struct Context<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx + 'static,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	Allocator: GlobalAlloc + 'static,
> {
	pub device_info: &'static DeviceInfo,
	pub profile_flash: ProfileFlash,
	pub change_profile_signal: &'static ChangeProfileSignal,
	pub serial_rx: SerialRx,
	pub serial_tx: SerialTx,
	pub external_tags_signal: &'static SetExternalTagsSignal,
	pub allocator: &'static TrackingAllocator<Allocator>,
}

impl<
		ProfileFlash: FlashMemory,
		ChangeProfileSignal: ChangeProfileSignalTx,
		SerialRx: SerialReader + SerialReaderExt,
		SerialTx: SerialWriter + SerialWriterExt,
		SetExternalTagsSignal: ExternalTagsSignalTx,
		Allocator: GlobalAlloc + 'static,
	>
	Context<ProfileFlash, ChangeProfileSignal, SerialRx, SerialTx, SetExternalTagsSignal, Allocator>
{
	pub fn new(
		device_info: &'static DeviceInfo,
		profile_flash: ProfileFlash,
		change_profile_signal: &'static ChangeProfileSignal,
		serial_rx: SerialRx,
		serial_tx: SerialTx,
		external_tags_signal: &'static SetExternalTagsSignal,
		allocator: &'static TrackingAllocator<Allocator>,
	) -> Self {
		Self {
			device_info,
			profile_flash,
			change_profile_signal,
			serial_rx,
			serial_tx,
			external_tags_signal,
			allocator,
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

impl<
		ProfileFlash: FlashMemory,
		ChangeProfileSignal: ChangeProfileSignalTx,
		SerialRx: SerialReader + SerialReaderExt,
		SerialTx: SerialWriter + SerialWriterExt,
		SetExternalTagsSignal: ExternalTagsSignalTx,
		Allocator: GlobalAlloc + 'static,
	> ContextDeviceInfo
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
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
	> ContextSerialRx
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
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
	> ContextSerialTx
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
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
	> ContextProfile
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
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
	> ContextTags
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
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
	> ContextAllocator
	for Context<
		ProfileFlash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		Allocator,
	>
{
	fn allocator(&self) -> &TrackingAllocator<Self::A> {
		self.allocator
	}
	type A = Allocator;
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

impl<M: RawMutex> ChangeProfileSignalTx for Signal<M, KeyboardProfile> {
	fn change_profile(&self, profile: KeyboardProfile) {
		self.signal(profile);
	}
}

impl<M: RawMutex> ChangeProfileSignalRx for Signal<M, KeyboardProfile> {
	fn try_get_changed_profile(&self) -> Option<KeyboardProfile> {
		self.try_take()
	}
}

impl<M: RawMutex> ExternalTagsSignalTx for Signal<M, Vec<LayerTag>> {
	fn set_external_tags(&self, tags: Vec<LayerTag>) {
		self.signal(tags);
	}
}

pub trait WaitForSerialConnection {
	async fn wait_for_serial_connection(&mut self);
}
