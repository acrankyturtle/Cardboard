use alloc::boxed::Box;
use alloc::vec::Vec;
use cardboard_lib::{
	command::CommandInfo,
	context::{FlashStore, RebootControl},
	device::{DeviceInfo, DeviceTypeId, DeviceVersion},
	embassy::{
		EmbassyFlashMemory, EmbassySerialPacketReader, EmbassySerialPacketWriter, EmbassyTickClock,
	},
	hid::HidDevice,
	input::{ColPin, KeyMatrix, RowPin},
	profile::{ConsumerControlEvent, KeyboardEvent, KeyboardProfile, MouseEvent},
	settings::{SettingsData, VersionedSettings},
	storage::{BlockFlashExt, FlashPartition, load_profile_from_flash, load_settings_from_flash, save_default_settings_to_flash},
};
use defmt::{info, warn};
use embassy_rp::{
	peripherals::{DMA_CH0, FLASH, USB, WATCHDOG},
	usb::Driver,
	watchdog::Watchdog,
};
use embassy_usb::{UsbDevice, class::hid::HidWriter};

use crate::{
	StaticCell, get_serial_number,
	rp2040::{
		bootloader::{EmbassyRp2040Reboot, EmbassyRp2040RebootToBootloader},
		config::DeviceConfig,
		flash::{FLASH_SIZE, init_flash},
		usb::{USB_SERIAL_PACKET_SIZE, init_usb},
	},
};

pub struct BootInput<S, const ROWS: usize, const COLS: usize>
where
	[(); ROWS * COLS]:,
	S: SettingsData + 'static,
{
	pub config: &'static DeviceConfig<S, ROWS, COLS>,
	pub command_info: Vec<CommandInfo>,
	pub flash_data_ptr: *const u8,
	pub flash: FLASH,
	pub flash_dma: DMA_CH0,
	pub usb: USB,
	pub watchdog: WATCHDOG,
	pub row_pins: [Box<dyn RowPin>; ROWS],
	pub col_pins: [Box<dyn ColPin>; COLS],
}

pub struct HidWriters<const K: usize, const M: usize, const C: usize> {
	pub keyboard: HidWriter<'static, Driver<'static, USB>, K>,
	pub mouse: Option<HidWriter<'static, Driver<'static, USB>, M>>,
	pub consumer: HidWriter<'static, Driver<'static, USB>, C>,
}

pub struct BootOutput<
	S,
	const ROWS: usize,
	const COLS: usize,
	const K: usize,
	const M: usize,
	const C: usize,
> where
	[(); ROWS * COLS]:,
	S: SettingsData,
{
	pub device_info: &'static DeviceInfo,
	pub flash_store: FlashStore<EmbassyFlashMemory<'static, FLASH_SIZE>>,
	pub matrix: KeyMatrix<ROWS, COLS>,
	pub profile: KeyboardProfile,
	pub settings: VersionedSettings<S>,
	pub serial_rx: EmbassySerialPacketReader<'static, USB_SERIAL_PACKET_SIZE>,
	pub serial_tx: EmbassySerialPacketWriter<'static, USB_SERIAL_PACKET_SIZE>,
	pub usb_device: UsbDevice<'static, Driver<'static, USB>>,
	pub hid_writers: HidWriters<K, M, C>,
	pub reboot: RebootControl,
	pub clock: &'static EmbassyTickClock,
	pub bootloader: &'static EmbassyRp2040RebootToBootloader,
}

pub async fn boot<
	S,
	KbdImpl,
	MouseImpl,
	ConsumerImpl,
	const ROWS: usize,
	const COLS: usize,
>(
	input: BootInput<S, ROWS, COLS>,
) -> BootOutput<S, ROWS, COLS, { KbdImpl::SIZE }, { MouseImpl::SIZE }, { ConsumerImpl::SIZE }>
where
	S: SettingsData + 'static,
	KbdImpl: HidDevice<KeyboardEvent>,
	MouseImpl: HidDevice<MouseEvent>,
	ConsumerImpl: HidDevice<ConsumerControlEvent>,
	[(); ROWS * COLS]:,
	[(); KbdImpl::SIZE]:,
	[(); MouseImpl::SIZE]:,
	[(); ConsumerImpl::SIZE]:,
{
	let cfg = input.config;

	// flash + device id
	let storage = init_flash(
		input.flash_data_ptr,
		cfg.flash.data_size,
		input.flash,
		input.flash_dma,
	)
	.await;
	let device_id = storage.device_id;
	let mut flash = storage.flash;

	// partitions
	let settings_partition = FlashPartition::new(0, cfg.flash.settings_size);
	let profile_partition = FlashPartition::new(cfg.flash.settings_size, cfg.flash.profile_size());

	// settings: load from flash, or stamp defaults
	let settings: VersionedSettings<S> =
		match load_settings_from_flash(&mut flash.partition(&settings_partition)).await {
			Ok(settings) => settings,
			Err(err) => {
				info!("No settings in flash ({}); initializing defaults", err);
				save_default_settings_to_flash(&mut flash.partition(&settings_partition))
					.await
					.unwrap_or_else(|err| {
						warn!("Failed to initialize settings flash: {}", err);
						VersionedSettings::default()
					})
			}
		};

	// device info (held in a static so command handlers can read it later)
	static DEVICE_INFO: StaticCell<DeviceInfo> = StaticCell::new();
	let device_info = DEVICE_INFO.init(DeviceInfo {
		id: device_id,
		manufacturer: cfg.manufacturer,
		r#type: DeviceTypeId::new(cfg.device_type),
		variant: cfg.variant,
		version: DeviceVersion::new(
			env!("CARGO_PKG_VERSION_MAJOR").parse().unwrap_or(0),
			env!("CARGO_PKG_VERSION_MINOR").parse().unwrap_or(0),
			env!("CARGO_PKG_VERSION_PATCH").parse().unwrap_or(0),
		),
		commands: input.command_info,
	});

	// clock
	static CLOCK: StaticCell<EmbassyTickClock> = StaticCell::new();
	let clock = CLOCK.init(EmbassyTickClock {});

	// matrix
	let debounce_time = (cfg.debounce_time)(&settings.inner);
	let matrix = KeyMatrix::new(cfg.key_ids, input.row_pins, input.col_pins, debounce_time);

	// profile
	let profile = match load_profile_from_flash(&mut flash.partition(&profile_partition)).await {
		Ok(profile) => {
			info!("Profile loaded from flash storage");
			profile
		}
		Err(err) => {
			warn!(
				"Failed to load profile from flash storage. Falling back to empty profile. Error: {}",
				err
			);
			KeyboardProfile::default()
		}
	};

	// reboot / bootloader
	let watchdog = Watchdog::new(input.watchdog);
	static REBOOT: StaticCell<EmbassyRp2040Reboot> = StaticCell::new();
	let reboot = REBOOT.init(EmbassyRp2040Reboot { watchdog });
	static BOOTLOADER: StaticCell<EmbassyRp2040RebootToBootloader> = StaticCell::new();
	let bootloader = BOOTLOADER.init(EmbassyRp2040RebootToBootloader {});

	// usb
	let serial_number = get_serial_number(&device_id);
	let mouse_enabled = (cfg.mouse_enabled)(&settings.inner);
	let usb = init_usb::<KbdImpl, MouseImpl, ConsumerImpl>(
		input.usb,
		device_info,
		serial_number,
		cfg.model,
		mouse_enabled,
	);
	let (serial_reader, serial_writer, usb_device) = (usb.serial_reader, usb.serial_writer, usb.device);
	let hid_writers = HidWriters {
		keyboard: usb.keyboard_writer,
		mouse: usb.mouse_writer,
		consumer: usb.consumer_writer,
	};

	let serial_rx =
		EmbassySerialPacketReader::<USB_SERIAL_PACKET_SIZE>::new(serial_reader, cfg.serial.read);
	let serial_tx =
		EmbassySerialPacketWriter::<USB_SERIAL_PACKET_SIZE>::new(serial_writer, cfg.serial.write);

	BootOutput {
		device_info,
		flash_store: FlashStore::new(flash, settings_partition, profile_partition),
		matrix,
		profile,
		settings,
		serial_rx,
		serial_tx,
		usb_device,
		hid_writers,
		reboot: RebootControl::new(reboot, bootloader),
		clock,
		bootloader,
	}
}

