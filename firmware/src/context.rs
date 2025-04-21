use crate::{
	device::DeviceInfo,
	serial::{ChunkedSerialReceiver, ChunkedSerialSender, SerialReceiver, SerialSender},
	storage::FlashMemory,
};

pub struct Context<
	ProfileFlash: FlashMemory,
	ProfileSignal: 'static,
	SerialReader: SerialReceiver + ChunkedSerialReceiver,
	SerialWriter: SerialSender + ChunkedSerialSender,
> {
	pub device_info: &'static DeviceInfo,
	pub profile_flash: ProfileFlash,
	pub change_profile_signal: &'static ProfileSignal,
	pub serial_rx: SerialReader,
	pub serial_tx: SerialWriter,
}

impl<
		ProfileFlash: FlashMemory,
		ProfileSignal,
		SerialRx: SerialReceiver + ChunkedSerialReceiver,
		SerialTx: SerialSender + ChunkedSerialSender,
	> Context<ProfileFlash, ProfileSignal, SerialRx, SerialTx>
{
	pub fn new(
		device_info: &'static DeviceInfo,
		profile_flash: ProfileFlash,
		change_profile_signal: &'static ProfileSignal,
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
	type SerialRx: SerialReceiver;
	fn serial_rx(&mut self) -> &mut Self::SerialRx;
}

pub trait ContextSerialTx {
	type SerialTx: SerialSender;
	fn serial_tx(&mut self) -> &mut Self::SerialTx;
}

impl<
		ProfileFlash: FlashMemory,
		ProfileSignal,
		SerialReader: SerialReceiver + ChunkedSerialReceiver,
		SerialWriter: SerialSender + ChunkedSerialSender,
	> ContextDeviceInfo for Context<ProfileFlash, ProfileSignal, SerialReader, SerialWriter>
{
	fn device_info(&self) -> &'static DeviceInfo {
		self.device_info
	}
}

impl<
		ProfileFlash: FlashMemory,
		ProfileSignal,
		SerialReader: SerialReceiver + ChunkedSerialReceiver,
		SerialWriter: SerialSender + ChunkedSerialSender,
	> ContextSerialRx for Context<ProfileFlash, ProfileSignal, SerialReader, SerialWriter>
{
	type SerialRx = SerialReader;
	fn serial_rx(&mut self) -> &mut Self::SerialRx {
		&mut self.serial_rx
	}
}

impl<
		ProfileFlash: FlashMemory,
		ProfileSignal,
		SerialReader: SerialReceiver + ChunkedSerialReceiver,
		SerialWriter: SerialSender + ChunkedSerialSender,
	> ContextSerialTx for Context<ProfileFlash, ProfileSignal, SerialReader, SerialWriter>
{
	type SerialTx = SerialWriter;
	fn serial_tx(&mut self) -> &mut Self::SerialTx {
		&mut self.serial_tx
	}
}
