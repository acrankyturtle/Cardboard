//! CK1-30 firmware entry point
//!
//! Build with:
//!   cargo build --release --bin ck1_30                         # default (no variant)
//!   cargo build --release --bin ck1_30 --features variant-blk  # BLK variant
//!   cargo build --release --bin ck1_30 --features variant-wht  # WHT variant

#![no_std]
#![no_main]
#![feature(type_alias_impl_trait)]
#![feature(impl_trait_in_assoc_type)]
#![feature(generic_const_exprs)]

extern crate alloc;
extern crate cortex_m;

use alloc::{boxed::Box, vec, vec::Vec};
use cardboard::{
	device_statics,
	rp2040::{boot, millis, BootInput, DeviceConfig, FlashLayout, SerialTimeouts},
	spawn_standard_tasks,
};
use cardboard_lib::{
	command::{
		Command, GetProfileCommand, GetSettingsCommand, GetStatusCommand, IdentifyCommand,
		RebootCommand, SetExternalTagsCommand, SetVirtualKeysCommand, UpdateProfileCommand,
		UpdateSettingsCommand,
	},
	context::{
		ExternalTagsSignalTx, FlashStore, RebootControl, UpdateProfileSignalTx, VirtualKeySignalTx,
	},
	device::{DeviceInfo, DeviceVariant},
	embassy::EmbassyTickClock,
	error::HeaplessSpscErrorLog,
	hid::{ConsumerControl, Gamepad, Mouse, NKROKeyboard},
	impl_context_allocator, impl_context_clock, impl_context_device_info, impl_context_error_log,
	impl_context_profile_flash, impl_context_reboot, impl_context_serial_rx,
	impl_context_serial_tx, impl_context_settings_flash, impl_context_tags,
	impl_context_update_profile, impl_context_virtual_keys,
	input::{ColPin, KeyId, RowPin},
	serial::BufferedReader,
	settings::SettingsData,
	stream::{ReadAsync, ReadAsyncExt, WriteAsync, WriteAsyncExt},
	TrackingAllocator,
};
use embassy_executor::Spawner;
use embassy_rp::gpio::{Input, Level, Output, Pin, Pull};
use embassy_sync::blocking_mutex::raw::ThreadModeRawMutex;
use uuid::uuid;

use {defmt_rtt as _, panic_probe as _};

const ROWS: usize = 5;
const COLS: usize = 6;
const VKB: usize = 4;
const FLASH_DATA_SIZE: usize = 500 * 1024;
const SETTINGS_SIZE: usize = 4 * 1024;

device_statics! {
	rows: ROWS,
	cols: COLS,
	virtual_key_bitfield: VKB,
	heap_size: 96 * 1024,
	flash_data_size: FLASH_DATA_SIZE,
	settings: Ck130Settings,
	keyboard: NKROKeyboard,
	mouse: Mouse,
	consumer: ConsumerControl,
	gamepad: Gamepad,
	mutex: ThreadModeRawMutex,
	context: Ck130Context,
}

const CK130_CONFIG: DeviceConfig<Ck130Settings, ROWS, COLS> = DeviceConfig {
	device_type: uuid!("0407db48-ca74-5783-9b11-489637b7c615"),
	manufacturer: "cranky",
	model: model(),
	variant: variant(),
	key_ids: [
		KeyId::new(uuid!("0661ee85-348b-5d93-b5e2-ac11cfa5344b")),
		KeyId::new(uuid!("87c4fd79-143b-576b-afa2-bea59e4cd02c")),
		KeyId::new(uuid!("1d652794-96a4-5c59-9948-afd441289317")),
		KeyId::new(uuid!("de57737c-e6c1-5818-bf94-d126ff5304a3")),
		KeyId::new(uuid!("85c20588-8148-5785-9e9f-44976e8dfef8")),
		KeyId::new(uuid!("b6ee974a-b405-5367-8c9f-e70a75045c37")),
		KeyId::new(uuid!("8a1052be-8165-5976-849b-511ce92f9956")),
		KeyId::new(uuid!("91206d06-70d4-5b75-9fdf-aad7f367fff5")),
		KeyId::new(uuid!("7abd3edf-f94c-522e-b2be-06a88bdb1cc9")),
		KeyId::new(uuid!("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4")),
		KeyId::new(uuid!("3a801a21-1ef7-5803-bf42-ecd1e8444656")),
		KeyId::new(uuid!("c54ec31f-2381-5636-b0a5-edd448294b88")),
		KeyId::new(uuid!("16ad3daf-bd00-5168-885a-74008ce8de35")),
		KeyId::new(uuid!("da390fc5-5361-5af9-9398-d3823b81ecba")),
		KeyId::new(uuid!("1a549b65-43d5-5068-a3f5-59429946e404")),
		KeyId::new(uuid!("ec06b9a0-0713-5db1-862c-20fafd2b0764")),
		KeyId::new(uuid!("cbfef260-a498-599f-a6c0-8a6a51002b76")),
		KeyId::new(uuid!("852caff2-9ef9-59a3-ae41-e5eec3fa0d21")),
		KeyId::new(uuid!("96148043-9890-5767-a464-1b12f126da14")),
		KeyId::new(uuid!("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13")),
		KeyId::new(uuid!("ab6039e8-38dc-5f91-b15c-6678def87cea")),
		KeyId::new(uuid!("0ef29fa7-07fb-5495-bb6f-33d164eda994")),
		KeyId::new(uuid!("e18caa6c-d922-558e-b146-0262173a28bd")),
		KeyId::new(uuid!("7b3285ea-4be6-5eae-9125-cec547fa3fb1")),
		KeyId::new(uuid!("4ade2cba-18d3-5fd0-a6d4-ba928bb47009")),
		KeyId::new(uuid!("474d0b39-6165-58e0-9745-2ca79493a9e8")),
		KeyId::new(uuid!("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0")),
		KeyId::new(uuid!("00a68179-7585-5f08-89fd-c63464760575")),
		KeyId::new(uuid!("7b743c81-7260-5ae3-8c7e-fc451751a2c7")),
		KeyId::new(uuid!("15c56a3d-0f31-5ebd-bcf1-63aa968be49a")),
	],
	bootloader_key_index: Some(0),
	mouse_enabled: |s| s.mouse_enabled,
	gamepad_enabled: |s| s.gamepad_enabled,
	debounce_time: |s| cardboard_lib::time::Duration::from_ticks(s.debounce_time_us as u64),
	tick_interval: millis(1),
	serial: SerialTimeouts::DEFAULTS,
	flash: FlashLayout {
		data_size: FLASH_DATA_SIZE,
		settings_size: SETTINGS_SIZE,
	},
};

const fn variant() -> Option<DeviceVariant> {
	#[cfg(feature = "variant-blk")]
	{
		Some(DeviceVariant::new("BLK"))
	}
	#[cfg(feature = "variant-wht")]
	{
		Some(DeviceVariant::new("WHT"))
	}
	#[cfg(not(any(feature = "variant-blk", feature = "variant-wht")))]
	{
		None
	}
}

const fn model() -> &'static str {
	#[cfg(feature = "variant-blk")]
	{
		"CK1-30 BLK"
	}
	#[cfg(feature = "variant-wht")]
	{
		"CK1-30 WHT"
	}
	#[cfg(not(any(feature = "variant-blk", feature = "variant-wht")))]
	{
		"CK1-30"
	}
}

pub struct Ck130Context {
	device_info: &'static DeviceInfo,
	flash: FlashStore<ContextFlashMemory>,
	serial_rx: ContextSerialReader,
	serial_tx: ContextSerialWriter,
	update_profile_signal: &'static dyn UpdateProfileSignalTx,
	external_tags_signal: &'static dyn ExternalTagsSignalTx,
	virtual_keys_signal: &'static dyn VirtualKeySignalTx<VKB>,
	allocator: &'static TrackingAllocator<Heap>,
	reboot: RebootControl,
	errors: HeaplessSpscErrorLog<32>,
	clock: &'static EmbassyTickClock,
}

impl_context_device_info!(Ck130Context, device_info);
impl_context_serial_rx!(Ck130Context, serial_rx: ContextSerialReader);
impl_context_serial_tx!(Ck130Context, serial_tx: ContextSerialWriter);
impl_context_settings_flash!(Ck130Context, flash: ContextFlashMemory);
impl_context_profile_flash!(Ck130Context, flash: ContextFlashMemory);
impl_context_update_profile!(Ck130Context, update_profile_signal);
impl_context_tags!(Ck130Context, external_tags_signal);
impl_context_virtual_keys!(Ck130Context, virtual_keys_signal, VKB);
impl_context_allocator!(Ck130Context, allocator: Heap);
impl_context_reboot!(Ck130Context, reboot);
impl_context_error_log!(Ck130Context, errors: HeaplessSpscErrorLog<32>);
impl_context_clock!(Ck130Context, clock);

#[embassy_executor::main]
async fn main(spawner: Spawner) -> () {
	init_heap();
	let p = embassy_rp::init(Default::default());

	let cmds: Vec<Box<dyn Command<Ck130Context>>> = vec![
		// identify MUST be first
		/* 0x00 */ Box::new(IdentifyCommand {}),
		/* 0x01 */ Box::new(UpdateProfileCommand {}),
		/* 0x02 */ Box::new(GetProfileCommand {}),
		/* 0x03 */ Box::new(SetExternalTagsCommand {}),
		/* 0x04 */ Box::new(RebootCommand {}),
		/* 0x05 */ Box::new(GetStatusCommand {}),
		/* 0x06 */ Box::new(SetVirtualKeysCommand::<VKB> {}),
		/* 0x07 */
		Box::new(UpdateSettingsCommand::<Settings, _>::new(|old, new| {
			// reboot if mouse_enabled or gamepad_enabled changed (requires USB re-enumeration)
			// reboot if debounce_time_us changed (KeyMatrix is constructed at boot)
			old.inner.mouse_enabled != new.inner.mouse_enabled
				|| old.inner.gamepad_enabled != new.inner.gamepad_enabled
				|| old.inner.debounce_time_us != new.inner.debounce_time_us
		})),
		/* 0x08 */ Box::new(GetSettingsCommand {}),
	];

	let command_info = cmds.iter().map(|c| c.info()).collect();

	let boot =
		boot::<Ck130Settings, NKROKeyboard, Mouse, ConsumerControl, Gamepad, ROWS, COLS>(BootInput {
			config: &CK130_CONFIG,
			command_info,
			flash_data_ptr: flash_data_ptr(),
			flash: p.FLASH,
			flash_dma: p.DMA_CH0,
			usb: p.USB,
			watchdog: p.WATCHDOG,
			row_pins: [
				p.PIN_28.degrade(),
				p.PIN_27.degrade(),
				p.PIN_26.degrade(),
				p.PIN_22.degrade(),
				p.PIN_21.degrade(),
			]
			.map(|pin| Box::new(Output::new(pin, Level::Low)) as Box<dyn RowPin>),
			col_pins: [
				p.PIN_16.degrade(),
				p.PIN_17.degrade(),
				p.PIN_9.degrade(),
				p.PIN_18.degrade(),
				p.PIN_19.degrade(),
				p.PIN_20.degrade(),
			]
			.map(|pin| Box::new(Input::new(pin, Pull::Down)) as Box<dyn ColPin>),
		})
		.await;

	let ctx = Ck130Context {
		device_info: boot.device_info,
		flash: boot.flash_store,
		serial_rx: BufferedReader::new(boot.serial_rx),
		serial_tx: boot.serial_tx,
		update_profile_signal: &PROFILE_CHANGED_SIGNAL,
		external_tags_signal: &EXTERNAL_TAGS_CHANGED_SIGNAL,
		virtual_keys_signal: &VIRTUAL_KEY_CHANNEL,
		allocator: &ALLOCATOR,
		reboot: boot.reboot,
		errors: HeaplessSpscErrorLog::new(),
		clock: boot.clock,
	};

	spawn_standard_tasks!(
		spawner: spawner,
		config: &CK130_CONFIG,
		boot: boot,
		ctx: ctx,
		cmds: cmds,
	);
}

pub struct Ck130Settings {
	mouse_enabled: bool,
	gamepad_enabled: bool,
	debounce_time_us: u32,
}

impl Default for Ck130Settings {
	fn default() -> Self {
		Self {
			mouse_enabled: true,
			gamepad_enabled: true,
			debounce_time_us: 10_000,
		}
	}
}

impl SettingsData for Ck130Settings {
	const VERSION: u32 = 2;

	async fn read_data<R: ReadAsync>(reader: &mut R) -> Result<Self, &'static str> {
		Ok(Self {
			mouse_enabled: reader
				.read_bool()
				.await
				.ok_or("Could not read mouse enabled")?,
			gamepad_enabled: reader
				.read_bool()
				.await
				.ok_or("Could not read gamepad enabled")?,
			debounce_time_us: reader
				.read_u32()
				.await
				.ok_or("Could not read debounce time")?,
		})
	}

	async fn write_data<W: WriteAsync>(&self, writer: &mut W) -> Result<(), &'static str> {
		writer.write_bool(self.mouse_enabled).await?;
		writer.write_bool(self.gamepad_enabled).await?;
		writer.write_u32(self.debounce_time_us).await
	}
}
