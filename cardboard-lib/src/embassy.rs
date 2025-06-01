use alloc::vec::Vec;
use defmt::error;
use embassy_rp::gpio::{Input, Output};
use embassy_rp::peripherals::USB;
use embassy_rp::usb::Driver;
use embassy_rp::{
	flash::{Async, ERASE_SIZE, Flash, WRITE_SIZE},
	peripherals::FLASH,
};

use embassy_sync::{blocking_mutex::raw::RawMutex, signal::Signal};
use embassy_time::Timer;
use embassy_usb::class::cdc_acm::{Receiver, Sender};

use crate::context::ExternalTagsSignalRx;
use crate::hid::{ConsumerControl, HidDevice, HidReport, Mouse, NKROKeyboard, ReportHid};
use crate::profile::{ConsumerControlEvent, KeyboardEvent, MouseEvent};
use crate::serial::{SerialPacketReader, SerialPacketSender};
use crate::storage::FlashMemory;
use crate::time::{Clock, Duration};
use crate::{
	context::{ChangeProfileSignalRx, ChangeProfileSignalTx, ExternalTagsSignalTx},
	input::{ColPin, RowPin},
	profile::{KeyboardProfile, LayerTag},
};

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

impl<M: RawMutex> ExternalTagsSignalRx for Signal<M, Vec<LayerTag>> {
	fn try_get_external_tags(&self) -> Option<Vec<LayerTag>> {
		self.try_take()
	}
}

impl<M: RawMutex> ChangeProfileSignalTx for &'static Signal<M, KeyboardProfile> {
	fn change_profile(&self, profile: KeyboardProfile) {
		(*self).change_profile(profile);
	}
}

impl<M: RawMutex> ChangeProfileSignalRx for &'static Signal<M, KeyboardProfile> {
	fn try_get_changed_profile(&self) -> Option<KeyboardProfile> {
		(*self).try_get_changed_profile()
	}
}

impl<M: RawMutex> ExternalTagsSignalTx for &'static Signal<M, Vec<LayerTag>> {
	fn set_external_tags(&self, tags: Vec<LayerTag>) {
		(*self).set_external_tags(tags);
	}
}

impl<M: RawMutex> ExternalTagsSignalRx for &'static Signal<M, Vec<LayerTag>> {
	fn try_get_external_tags(&self) -> Option<Vec<LayerTag>> {
		(*self).try_get_external_tags()
	}
}

impl RowPin for Output<'_> {
	fn set_high(&mut self) {
		self.set_high();
	}

	fn set_low(&mut self) {
		self.set_low();
	}
}

impl ColPin for Input<'_> {
	fn is_high(&self) -> bool {
		self.is_high()
	}
}

pub struct EmbassySerialPacketReader<'d, const SIZE: usize> {
	receiver: Receiver<'d, Driver<'d, USB>>,
	timeout: embassy_time::Duration,
}

pub struct EmbassySerialPacketWriter<'d, const SIZE: usize> {
	sender: Sender<'d, Driver<'d, USB>>,
	timeout: embassy_time::Duration,
}

impl<'d, const SIZE: usize> EmbassySerialPacketReader<'d, SIZE> {
	pub fn new(receiver: Receiver<'d, Driver<'d, USB>>, timeout: crate::time::Duration) -> Self {
		Self {
			receiver,
			timeout: embassy_time::Duration::from_millis(timeout.to_millis() as u64),
		}
	}
}

impl<'d, const SIZE: usize> EmbassySerialPacketWriter<'d, SIZE> {
	pub fn new(sender: Sender<'d, Driver<'d, USB>>, timeout: crate::time::Duration) -> Self {
		Self {
			sender,
			timeout: embassy_time::Duration::from_millis(timeout.to_millis() as u64),
		}
	}
}

impl<'d, const SIZE: usize> SerialPacketReader for EmbassySerialPacketReader<'d, SIZE> {
	async fn read_packet(&mut self, buf: &mut [u8]) -> Result<usize, &'static str> {
		let timer = Timer::after(self.timeout);

		let result =
			embassy_futures::select::select(self.receiver.read_packet(buf), async { timer.await })
				.await;

		match result {
			embassy_futures::select::Either::First(result) => result.map_err(|_| "Endpoint error"),
			embassy_futures::select::Either::Second(_) => Err("Read timeout"),
		}
	}
	const SIZE: usize = SIZE;
}

impl<'d, const SIZE: usize> SerialPacketSender for EmbassySerialPacketWriter<'d, SIZE> {
	async fn write_packet(&mut self, data: &[u8]) -> Result<(), &'static str> {
		let timer = Timer::after(self.timeout);
		let result =
			embassy_futures::select::select(self.sender.write_packet(data), async { timer.await })
				.await;

		match result {
			embassy_futures::select::Either::First(result) => result.map_err(|_| "Endpoint error"),
			embassy_futures::select::Either::Second(_) => Err("Write timeout"),
		}
	}
	const SIZE: usize = SIZE;
}

pub struct EmbassyFlashMemory<'d, const SIZE: usize> {
	flash_addr: *const u8,
	storage_addr: *const u8,
	length: usize,
	flash: Flash<'d, FLASH, Async, SIZE>,
}

impl<'d, const SIZE: usize> EmbassyFlashMemory<'d, SIZE> {
	pub fn new(
		flash_addr: *const u8,
		storage_addr: *const u8,
		length: usize,
		flash: Flash<'d, FLASH, Async, SIZE>,
	) -> Self {
		if storage_addr as usize % WRITE_SIZE != 0 {
			error!(
				"Base address is not write block aligned: {}",
				storage_addr as usize
			);
			panic!("Base address is not write block aligned");
		}

		if storage_addr as usize % ERASE_SIZE != 0 {
			error!(
				"Base address is not erase block aligned: {}",
				storage_addr as usize
			);
			panic!("Base address is not erase block aligned");
		}

		if length % WRITE_SIZE != 0 {
			error!("Length is not block aligned: {}", length);
			panic!("Length is not block aligned");
		}

		if length % ERASE_SIZE != 0 {
			error!("Length is not erase block aligned: {}", length);
			panic!("Length is not erase block aligned");
		}

		EmbassyFlashMemory {
			flash_addr,
			storage_addr,
			length,
			flash,
		}
	}

	fn get_flash_offset(&self) -> usize {
		self.storage_addr as usize - self.flash_addr as usize
	}

	fn get_flash_end_offset(&self) -> usize {
		self.get_flash_offset() + self.length
	}
}

impl<'a, const SIZE: usize> FlashMemory for EmbassyFlashMemory<'a, SIZE> {
	fn as_slice(&self) -> &'static [u8] {
		unsafe { core::slice::from_raw_parts(self.storage_addr, self.length) }
	}

	fn erase_all(&mut self) -> Result<(), &'static str> {
		self.flash
			.blocking_erase(
				self.get_flash_offset() as u32,
				self.get_flash_end_offset() as u32,
			)
			.map_err(|e| {
				error!("Error erasing flash memory: {:?}", e);
				"Error erasing flash memory"
			})
	}

	fn write(&mut self, offset: usize, data: &[u8]) -> Result<(), &'static str> {
		if offset + data.len() > self.length {
			error!(
				"Write out of bounds: {} + {} > {}",
				offset,
				data.len(),
				self.length
			);
			return Err("Write out of bounds");
		}

		if offset % WRITE_SIZE != 0 {
			error!("Offset is not block aligned ({}): {}", WRITE_SIZE, offset);
			return Err("Offset is not block aligned");
		}

		if data.len() % WRITE_SIZE != 0 {
			error!(
				"Length is not block aligned ({}): {}",
				WRITE_SIZE,
				data.len()
			);
			return Err("Length is not block aligned");
		}

		self.flash
			.blocking_write(self.get_flash_offset() as u32 + offset as u32, data)
			.map_err(|e| {
				error!("Error writing to flash memory: {:?}", e);
				"Error writing to flash memory"
			})
	}

	const SIZE: usize = SIZE;
}

pub struct EmbassyTickClock {}

impl Clock for EmbassyTickClock {
	fn now(&self) -> crate::time::Instant {
		crate::time::Instant::from_ticks(embassy_time::Instant::now().as_micros())
	}

	async fn after(&self, duration: Duration) {
		Timer::after(embassy_time::Duration::from_micros(duration.to_micros())).await;
	}

	async fn at(&self, instant: crate::time::Instant) {
		Timer::at(embassy_time::Instant::from_ticks(instant.ticks())).await;
	}
}

pub struct EmbassyKeypadHid<
	HidKeyboard: HidDevice<KeyboardEvent> + 'static,
	HidMouse: HidDevice<MouseEvent> + 'static,
	HidConsumer: HidDevice<ConsumerControlEvent> + 'static,
	M: 'static + RawMutex,
> where
	[(); HidKeyboard::SIZE]:,
	[(); HidMouse::SIZE]:,
	[(); HidConsumer::SIZE]:,
{
	pub keyboard: HidKeyboard,
	pub mouse: HidMouse,
	pub consumer: HidConsumer,
	pub signal: &'static Signal<
		M,
		HidReport<{ HidKeyboard::SIZE }, { HidMouse::SIZE }, { HidConsumer::SIZE }>,
	>,
}

impl<
	HidKeyboard: HidDevice<KeyboardEvent>,
	HidMouse: HidDevice<MouseEvent>,
	HidConsumer: HidDevice<ConsumerControlEvent>,
	M: 'static + RawMutex,
> ReportHid for EmbassyKeypadHid<HidKeyboard, HidMouse, HidConsumer, M>
where
	[(); HidKeyboard::SIZE]:,
	[(); HidMouse::SIZE]:,
	[(); HidConsumer::SIZE]:,
{
	fn report_keyboard(&mut self, report: crate::profile::KeyboardEvent) {
		self.keyboard.input(report);
	}

	fn report_mouse(&mut self, report: crate::profile::MouseEvent) {
		self.mouse.input(report);
	}

	fn report_consumer(&mut self, report: crate::profile::ConsumerControlEvent) {
		self.consumer.input(report);
	}

	fn flush(&mut self) {
		let keyboard = self.keyboard.create_report();
		let mouse = self.mouse.create_report();
		let consumer = self.consumer.create_report();

		self.signal.signal(HidReport {
			keyboard,
			mouse,
			consumer,
		});
	}

	fn reset(&mut self) {
		self.keyboard.reset();
		self.mouse.reset();
		self.consumer.reset();

		self.signal.signal(HidReport {
			keyboard: None,
			mouse: None,
			consumer: None,
		});
	}
}
