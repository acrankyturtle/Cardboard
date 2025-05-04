use cardboard_lib::serial::{SerialReader, SerialReaderExt, SerialWriter, SerialWriterExt};
use embassy_sync::{blocking_mutex::raw::RawMutex, signal::Signal};

use crate::{device::DeviceInfo, profile::KeyboardProfile, storage::FlashMemory};

pub struct Context<
	ProfileFlash: FlashMemory,
	ChangeProfileSignal: ChangeProfileSignalTx + 'static,
	SerialRx: SerialReader + SerialReaderExt,
	SerialTx: SerialWriter + SerialWriterExt,
> {
	pub device_info: &'static DeviceInfo,
	pub profile_flash: ProfileFlash,
	pub change_profile_signal: &'static ChangeProfileSignal,
	pub serial_rx: SerialRx,
	pub serial_tx: SerialTx,
}

impl<
		ProfileFlash: FlashMemory,
		ChangeProfileSignal: ChangeProfileSignalTx,
		SerialRx: SerialReader + SerialReaderExt,
		SerialTx: SerialWriter + SerialWriterExt,
	> Context<ProfileFlash, ChangeProfileSignal, SerialRx, SerialTx>
{
	pub fn new(
		device_info: &'static DeviceInfo,
		profile_flash: ProfileFlash,
		change_profile_signal: &'static ChangeProfileSignal,
		serial_rx: SerialRx,
		serial_tx: SerialTx,
	) -> Self {
		Self {
			device_info,
			profile_flash,
			change_profile_signal,
			serial_rx,
			serial_tx,
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

impl<
		ProfileFlash: FlashMemory,
		ChangeProfileSignal: ChangeProfileSignalTx,
		SerialRx: SerialReader + SerialReaderExt,
		SerialTx: SerialWriter + SerialWriterExt,
	> ContextDeviceInfo for Context<ProfileFlash, ChangeProfileSignal, SerialRx, SerialTx>
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
	> ContextSerialRx for Context<ProfileFlash, ChangeProfileSignal, SerialRx, SerialTx>
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
	> ContextSerialTx for Context<ProfileFlash, ChangeProfileSignal, SerialRx, SerialTx>
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
	> ContextProfile for Context<ProfileFlash, ChangeProfileSignal, SerialRx, SerialTx>
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

pub trait ChangeProfileSignalTx {
	fn change_profile(&self, profile: KeyboardProfile);
}

pub trait ChangeProfileSignalRx {
	fn try_get_changed_profile(&self) -> Option<KeyboardProfile>;
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

pub trait WaitForSerialConnection {
	async fn wait_for_serial_connection(&mut self);
}
