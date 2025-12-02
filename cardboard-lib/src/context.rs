use core::alloc::GlobalAlloc;

use crate::{
	TrackingAllocator,
	device::DeviceInfo,
	error::ErrorLog,
	profile::{KeyboardProfile, LayerTag},
	serial::SerialDrain,
	storage::{BlockFlash, BlockFlashExt, FlashPartition, PartitionedFlashMemory},
	stream::{ReadAsync, ReadAsyncExt, WriteAsync, WriteAsyncExt},
};
use alloc::vec::Vec;

pub struct Context<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx + 'static,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader + 'static,
	Errors: ErrorLog,
	Clock: crate::time::Clock + 'static,
> {
	pub device_info: &'static DeviceInfo,
	pub flash: Flash,
	pub settings_partition: FlashPartition<Flash>,
	pub profile_partition: FlashPartition<Flash>,
	pub change_profile_signal: &'static ChangeProfileSignal,
	pub serial_rx: SerialRx,
	pub serial_tx: SerialTx,
	pub external_tags_signal: &'static SetExternalTagsSignal,
	pub virtual_keys_signal: &'static SetVirtualKeysSignal,
	pub allocator: &'static TrackingAllocator<Allocator>,
	pub bootloader: &'static Bootloader,
	pub errors: Errors,
	pub clock: &'static Clock,
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
>
	Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	pub fn new(
		device_info: &'static DeviceInfo,
		flash: Flash,
		settings_partition: FlashPartition<Flash>,
		profile_partition: FlashPartition<Flash>,
		change_profile_signal: &'static ChangeProfileSignal,
		serial_rx: SerialRx,
		serial_tx: SerialTx,
		external_tags_signal: &'static SetExternalTagsSignal,
		virtual_keys_signal: &'static SetVirtualKeysSignal,
		allocator: &'static TrackingAllocator<Allocator>,
		bootloader: &'static Bootloader,
		errors: Errors,
		clock: &'static Clock,
	) -> Self {
		Self {
			device_info,
			flash,
			settings_partition,
			profile_partition,
			change_profile_signal,
			serial_rx,
			serial_tx,
			external_tags_signal,
			virtual_keys_signal,
			allocator,
			bootloader,
			errors,
			clock,
		}
	}
}

pub trait ContextDeviceInfo {
	fn device_info(&self) -> &'static DeviceInfo;
}

pub trait ContextSerialRx {
	type SerialRx: ReadAsync + ReadAsyncExt + SerialDrain;
	fn serial_rx(&mut self) -> &mut Self::SerialRx;
}

pub trait ContextSerialTx {
	type SerialTx: WriteAsync + WriteAsyncExt; // todo: is ext required?
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

pub trait ContextChangeProfile {
	type ChangeProfileSignal: ChangeProfileSignalTx;
	fn profile_signal(&mut self) -> &Self::ChangeProfileSignal;
}

pub trait ContextTags {
	fn set_external_tags(&mut self, tags: Vec<LayerTag>);
}

pub trait ContextVirtualKeys<const VIRTUAL_KEY_BITFIELD_BYTES: usize> {
	fn set_virtual_keys(&mut self, state: [u8; VIRTUAL_KEY_BITFIELD_BYTES]);
}

pub trait ContextAllocator {
	fn allocator(&self) -> &TrackingAllocator<Self::A>;
	type A: GlobalAlloc;
}

pub trait ContextBootloader {
	fn reboot_to_bootloader(&mut self) -> !;
}

pub trait ContextErrorLog {
	fn errors(&mut self) -> &mut Self::Errors;
	type Errors: ErrorLog;
}

pub trait ContextClock {
	fn clock(&self) -> &impl crate::time::Clock;
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextDeviceInfo
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	fn device_info(&self) -> &'static DeviceInfo {
		self.device_info
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt + SerialDrain,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextSerialRx
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	type SerialRx = SerialRx;
	fn serial_rx(&mut self) -> &mut Self::SerialRx {
		&mut self.serial_rx
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextSerialTx
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	type SerialTx = SerialTx;
	fn serial_tx(&mut self) -> &mut Self::SerialTx {
		&mut self.serial_tx
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextSettingsFlash
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	type Flash = Flash;

	fn settings_flash(&mut self) -> PartitionedFlashMemory<Flash> {
		self.flash.partition(&self.settings_partition)
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextProfileFlash
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	type Flash = Flash;

	fn profile_flash(&mut self) -> PartitionedFlashMemory<Flash> {
		self.flash.partition(&self.profile_partition)
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextChangeProfile
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	type ChangeProfileSignal = ChangeProfileSignal;
	fn profile_signal(&mut self) -> &Self::ChangeProfileSignal {
		self.change_profile_signal
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextTags
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	fn set_external_tags(&mut self, tags: Vec<LayerTag>) {
		self.external_tags_signal.set_external_tags(tags);
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx + 'static,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader + 'static,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextVirtualKeys<VIRTUAL_KEY_BITFIELD_BYTES>
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	fn set_virtual_keys(&mut self, state: [u8; VIRTUAL_KEY_BITFIELD_BYTES]) {
		let state_ptr: *const [u8; VIRTUAL_KEY_BITFIELD_BYTES] = &state;
		let state: [u8; VIRTUAL_KEY_BITFIELD_BYTES] =
			unsafe { *state_ptr.cast::<[u8; VIRTUAL_KEY_BITFIELD_BYTES]>() };
		self.virtual_keys_signal.set_virtual_keys(state);
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextAllocator
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	fn allocator(&self) -> &TrackingAllocator<Self::A> {
		self.allocator
	}
	type A = Allocator;
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextBootloader
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	fn reboot_to_bootloader(&mut self) -> ! {
		self.bootloader.reboot_to_bootloader()
	}
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextErrorLog
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	fn errors(&mut self) -> &mut Self::Errors {
		&mut self.errors
	}
	type Errors = Errors;
}

impl<
	Flash: BlockFlash,
	ChangeProfileSignal: ChangeProfileSignalTx,
	SerialRx: ReadAsync + ReadAsyncExt,
	SerialTx: WriteAsync + WriteAsyncExt,
	SetExternalTagsSignal: ExternalTagsSignalTx + 'static,
	const VIRTUAL_KEY_BITFIELD_BYTES: usize,
	SetVirtualKeysSignal: VirtualKeySignalTx<VIRTUAL_KEY_BITFIELD_BYTES> + 'static,
	Allocator: GlobalAlloc + 'static,
	Bootloader: RebootToBootloader,
	Errors: ErrorLog,
	Clock: crate::time::Clock,
> ContextClock
	for Context<
		Flash,
		ChangeProfileSignal,
		SerialRx,
		SerialTx,
		SetExternalTagsSignal,
		VIRTUAL_KEY_BITFIELD_BYTES,
		SetVirtualKeysSignal,
		Allocator,
		Bootloader,
		Errors,
		Clock,
	>
{
	fn clock(&self) -> &impl crate::time::Clock {
		self.clock
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

pub trait VirtualKeySignalTx<const SIZE: usize> {
	fn set_virtual_keys(&self, state: [u8; SIZE]);
}

pub trait VirtualKeySignalRx<const SIZE: usize> {
	fn try_get_virtual_keys(&self) -> Option<[u8; SIZE]>;
}

pub trait RebootToBootloader {
	fn reboot_to_bootloader(&self) -> !;
}
