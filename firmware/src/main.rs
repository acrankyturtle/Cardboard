#![no_std]
#![no_main]
#![feature(type_alias_impl_trait)]
#![feature(impl_trait_in_assoc_type)]
#![feature(generic_const_exprs)]

extern crate alloc;
extern crate cortex_m;
extern crate usbd_human_interface_device;

use alloc::boxed::Box;
use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;
use cardboard::context::Context;
use cardboard::device::{DeviceId, DeviceInfo};
use cardboard::hid::HidDevice;
use cardboard::profile::ActionEvent;
use cardboard::profile::KeyboardProfile;
use cardboard::state::KeyboardState;
use cardboard::storage::{load_profile_from_flash, EmbassyFlashMemory, FlashMemory};
use cardboard::StaticCell;
use cardboard_lib::input::{ColPin, KeyId, KeyMatrix, KeyState, RowPin};
use cardboard_lib::serial::embassy::{EmbassySerialPacketReader, EmbassySerialPacketWriter};
use cardboard_lib::serial::{BufferedReader, SerialReaderExt};
use core::mem::MaybeUninit;
use core::ops::Add;
use defmt::*;
use embassy_executor::Spawner;
use embassy_rp::bind_interrupts;
use embassy_rp::flash::{Async, Flash};
use embassy_rp::gpio::{AnyPin, Input, Level, Output, Pin, Pull};
use embassy_rp::peripherals::{DMA_CH0, FLASH, USB};
use embassy_rp::usb::{Driver, InterruptHandler};
use embassy_sync::blocking_mutex::raw::{NoopRawMutex, ThreadModeRawMutex};
use embassy_sync::signal::Signal;
use embassy_time::{Delay, Duration, Instant, Timer};
use embassy_usb::class::cdc_acm::{CdcAcmClass, Receiver};
use embassy_usb::class::hid::{HidWriter, State};
use embassy_usb::control::{Request, RequestType};
use embassy_usb::{Builder, Config, Handler, UsbDevice, UsbDeviceState};
use embedded_hal_async::delay::DelayNs;
use serde::de;

use {defmt_rtt as _, panic_probe as _}; // global logger

use cardboard::command::{ChangeProfileCommand, Command, IdentifyCommand};
use embedded_alloc::LlffHeap as Heap;
use uuid::Uuid;

const FLASH_ADDR: *const u8 = 0x10000000 as *const u8;
const FLASH_SIZE: usize = 2 * 1024 * 1024; // 2 MB

// profile flash storage
#[link_section = ".profile"]
static mut PROFILE: MaybeUninit<[u8; PROFILE_SIZE]> = MaybeUninit::uninit();
const PROFILE_SIZE: usize = 500 * 1024; // 500 KB

// allocator setup
const HEAP_SIZE: usize = 1024 * 4; // 4 KB

// matrix
const ROWS: usize = 5;
const COLS: usize = 6;

// usb
const USB_HID_KEYBOARD_PACKET_SIZE: usize = 32;
const USB_HID_MOUSE_PACKET_SIZE: usize = 32;
const USB_HID_CONSUMER_PACKET_SIZE: usize = 32;
const USB_SERIAL_PACKET_SIZE: usize = 64;

// hid
type KeyboardImpl = cardboard::hid::NKROKeyboard;
type MouseImpl = cardboard::hid::Mouse;
type ConsumerImpl = cardboard::hid::ConsumerControl;

fn create_device_info(
	cmds: &[Box<dyn Command<CommandContext>>; CMD_COUNT],
) -> (&'static DeviceInfo, &'static str) {
	let id = DeviceId::new(Uuid::from_u128(0xd6875554_8cb4_5a57_b81f_70e91a6b7841));

	let serial_number = unsafe {
		static mut SERIAL_NUMBER: MaybeUninit<String> = MaybeUninit::uninit();
		SERIAL_NUMBER.write(id.to_string())
	};

	unsafe {
		static mut DEVICE_INFO: MaybeUninit<DeviceInfo> = MaybeUninit::uninit();
		(
			DEVICE_INFO.write(DeviceInfo {
				id,
				name: "Cardboard",
				manufacturer: "cranky",
				commands: cmds.iter().map(|cmd| cmd.info()).collect(),
			}),
			serial_number.as_str(),
		)
	}
}

const CMD_COUNT: usize = 2;

static mut COMMANDS: MaybeUninit<[Box<dyn Command<CommandContext>>; CMD_COUNT]> =
	MaybeUninit::uninit();
fn create_cmds() -> &'static mut [Box<dyn Command<CommandContext>>; CMD_COUNT] {
	let cmds: [Box<dyn Command<CommandContext>>; CMD_COUNT] = [
		Box::new(IdentifyCommand {}), // identify MUST be first
		Box::new(ChangeProfileCommand {}),
	];

	unsafe { COMMANDS.write(cmds) }
}

type CommandContext = Context<
	EmbassyFlashMemory<'static, FLASH_SIZE>,
	Signal<ThreadModeRawMutex, KeyboardProfile>,
	BufferedReader<EmbassySerialPacketReader<'static, USB_SERIAL_PACKET_SIZE>>,
	EmbassySerialPacketWriter<'static, USB_SERIAL_PACKET_SIZE>,
>;

static HID_SIGNAL: Signal<ThreadModeRawMutex, HidReport> = Signal::new();
static PROFILE_CHANGED_SIGNAL: Signal<ThreadModeRawMutex, KeyboardProfile> = Signal::new();

bind_interrupts!(struct Irqs {
	USBCTRL_IRQ => InterruptHandler<USB>;
});

#[embassy_executor::main]
async fn main(spawner: Spawner) -> () {
	info!("Program start");
	initialize_allocator();

	let p = embassy_rp::init(Default::default());

	let key_ids: [KeyId; ROWS * COLS] = [
		KeyId::new(Uuid::parse_str("0661ee85-348b-5d93-b5e2-ac11cfa5344b").unwrap()),
		KeyId::new(Uuid::parse_str("87c4fd79-143b-576b-afa2-bea59e4cd02c").unwrap()),
		KeyId::new(Uuid::parse_str("1d652794-96a4-5c59-9948-afd441289317").unwrap()),
		KeyId::new(Uuid::parse_str("de57737c-e6c1-5818-bf94-d126ff5304a3").unwrap()),
		KeyId::new(Uuid::parse_str("85c20588-8148-5785-9e9f-44976e8dfef8").unwrap()),
		KeyId::new(Uuid::parse_str("b6ee974a-b405-5367-8c9f-e70a75045c37").unwrap()),
		KeyId::new(Uuid::parse_str("8a1052be-8165-5976-849b-511ce92f9956").unwrap()),
		KeyId::new(Uuid::parse_str("91206d06-70d4-5b75-9fdf-aad7f367fff5").unwrap()),
		KeyId::new(Uuid::parse_str("7abd3edf-f94c-522e-b2be-06a88bdb1cc9").unwrap()),
		KeyId::new(Uuid::parse_str("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4").unwrap()),
		KeyId::new(Uuid::parse_str("3a801a21-1ef7-5803-bf42-ecd1e8444656").unwrap()),
		KeyId::new(Uuid::parse_str("c54ec31f-2381-5636-b0a5-edd448294b88").unwrap()),
		KeyId::new(Uuid::parse_str("16ad3daf-bd00-5168-885a-74008ce8de35").unwrap()),
		KeyId::new(Uuid::parse_str("da390fc5-5361-5af9-9398-d3823b81ecba").unwrap()),
		KeyId::new(Uuid::parse_str("1a549b65-43d5-5068-a3f5-59429946e404").unwrap()),
		KeyId::new(Uuid::parse_str("ec06b9a0-0713-5db1-862c-20fafd2b0764").unwrap()),
		KeyId::new(Uuid::parse_str("cbfef260-a498-599f-a6c0-8a6a51002b76").unwrap()),
		KeyId::new(Uuid::parse_str("852caff2-9ef9-59a3-ae41-e5eec3fa0d21").unwrap()),
		KeyId::new(Uuid::parse_str("96148043-9890-5767-a464-1b12f126da14").unwrap()),
		KeyId::new(Uuid::parse_str("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13").unwrap()),
		KeyId::new(Uuid::parse_str("ab6039e8-38dc-5f91-b15c-6678def87cea").unwrap()),
		KeyId::new(Uuid::parse_str("0ef29fa7-07fb-5495-bb6f-33d164eda994").unwrap()),
		KeyId::new(Uuid::parse_str("e18caa6c-d922-558e-b146-0262173a28bd").unwrap()),
		KeyId::new(Uuid::parse_str("7b3285ea-4be6-5eae-9125-cec547fa3fb1").unwrap()),
		KeyId::new(Uuid::parse_str("4ade2cba-18d3-5fd0-a6d4-ba928bb47009").unwrap()),
		KeyId::new(Uuid::parse_str("474d0b39-6165-58e0-9745-2ca79493a9e8").unwrap()),
		KeyId::new(Uuid::parse_str("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0").unwrap()),
		KeyId::new(Uuid::parse_str("00a68179-7585-5f08-89fd-c63464760575").unwrap()),
		KeyId::new(Uuid::parse_str("7b743c81-7260-5ae3-8c7e-fc451751a2c7").unwrap()),
		KeyId::new(Uuid::parse_str("15c56a3d-0f31-5ebd-bcf1-63aa968be49a").unwrap()),
	];

	let matrix = create_matrix(
		key_ids,
		[
			p.PIN_28.degrade(),
			p.PIN_27.degrade(),
			p.PIN_26.degrade(),
			p.PIN_22.degrade(),
			p.PIN_21.degrade(),
		],
		[
			p.PIN_16.degrade(),
			p.PIN_17.degrade(),
			p.PIN_9.degrade(),
			p.PIN_18.degrade(),
			p.PIN_19.degrade(),
			p.PIN_20.degrade(),
		],
	);

	let cmds = create_cmds();

	let (device_info, serial_number) = create_device_info(cmds);

	let mut usb = init_usb(p.USB, device_info, &serial_number);

	spawner.spawn(usb_task(usb.device)).unwrap();

	spawner
		.spawn(hid_task(
			usb.keyboard_writer,
			usb.mouse_writer,
			usb.consumer_writer,
			&HID_SIGNAL,
		))
		.unwrap();

	let keyboard = KeyboardImpl::new();
	let mouse = MouseImpl::new();
	let consumer = ConsumerImpl::new();

	Timer::after_millis(10).await;

	let mut flash = init_flash(p.FLASH, p.DMA_CH0);

	let profile = match load_profile_from_flash(&mut flash.profile_flash) {
		Ok(profile) => {
			info!("Profile loaded from flash storage");
			profile
		}
		Err(err) => {
			error!("Failed to load profile from flash storage. Falling back to empty profile. Error: {}", err);
			KeyboardProfile::default()
		}
	};

	spawner
		.spawn(keypad_task(
			matrix,
			profile,
			keyboard,
			mouse,
			consumer,
			&PROFILE_CHANGED_SIGNAL,
			&HID_SIGNAL,
		))
		.unwrap();

	usb.serial_reader.wait_connection().await;
	usb.serial_writer.wait_connection().await;

	let serial_reader =
		EmbassySerialPacketReader::<{ USB_SERIAL_PACKET_SIZE }>::new(usb.serial_reader);
	let serial_reader = BufferedReader::new(serial_reader);
	let serial_writer =
		EmbassySerialPacketWriter::<{ USB_SERIAL_PACKET_SIZE }>::new(usb.serial_writer);

	let cmd_ctx = CommandContext::new(
		&device_info,
		flash.profile_flash,
		&PROFILE_CHANGED_SIGNAL,
		serial_reader,
		serial_writer,
	);

	spawner.spawn(cmd_task(cmd_ctx, cmds)).unwrap();

	info!("Ready");
}

// USB task to run the USB stack
#[embassy_executor::task]
async fn usb_task(mut usb: UsbDevice<'static, Driver<'static, USB>>) {
	info!("USB task started.");
	usb.run().await;
}

#[embassy_executor::task]
async fn keypad_task(
	mut matrix: KeyMatrix<ROWS, COLS, { ROWS * COLS }>,
	profile: KeyboardProfile,
	mut hid_keyboard: KeyboardImpl,
	mut hid_mouse: MouseImpl,
	mut hid_consumer: ConsumerImpl,
	profile_changed: &'static Signal<ThreadModeRawMutex, KeyboardProfile>,
	hid_report: &'static Signal<ThreadModeRawMutex, HidReport>,
) {
	info!("Keypad task started.");

	let mut profile = profile;
	let mut state = KeyboardState::from(&profile);

	let mut key_actions = Vec::with_capacity(ROWS * COLS);
	let mut macro_events = Vec::with_capacity(16);

	let mut prev_timestamp = Instant::now();

	loop {
		if let Some(new_profile) = profile_changed.try_take() {
			profile = new_profile;
			state = KeyboardState::from(&profile);
			hid_keyboard.reset();
			hid_mouse.reset();
			hid_consumer.reset();
			info!("Profile updated");
		}

		let now = Instant::now();
		let dt = now.duration_since(prev_timestamp);

		// read key matrix and update macro state with results
		key_actions.clear();
		matrix.update(dt, &mut key_actions);
		for key in key_actions.iter() {
			match key.action {
				KeyState::Pressed => {
					state.press_key(key.key_id);
					info!("Pressed!");
				}
				KeyState::Released => {
					state.release_key(key.key_id);
				}
			}
		}

		if !key_actions.is_empty() {
			info!("Key actions: {:?}", key_actions.len());
		}

		// tick macros
		macro_events.clear();
		state.tick(dt.as_millis() as u32, &mut macro_events);

		if macro_events.len() > 0 {
			info!("Macro events: {:?}", macro_events.len());
		}

		// process each macro event and update hid states
		for macro_event in macro_events.iter() {
			match macro_event {
				ActionEvent::DebugLog(event) => {
					info!("Debug event: {:?}", event.message.as_str())
				}
				ActionEvent::None => {}
				ActionEvent::Keyboard(event) => hid_keyboard.input(event),
				ActionEvent::Mouse(event) => hid_mouse.input(event),
				ActionEvent::ConsumerControl(event) => {
					hid_consumer.input(event);
				}
				ActionEvent::Layer(_) => {}
			}
		}

		let keyboard_report = hid_keyboard.create_report();
		let mouse_report = hid_mouse.create_report();
		let consumer_report = hid_consumer.create_report();

		let report = HidReport {
			keyboard: keyboard_report,
			mouse: mouse_report,
			consumer: consumer_report,
		};
		hid_report.signal(report);

		// wait for next tick
		prev_timestamp = now;
		let next_tick = now.add(Duration::from_millis(1));
		Timer::at(next_tick).await;
	}
}

struct HidReport {
	keyboard: Option<[u8; KeyboardImpl::SIZE]>,
	mouse: Option<[u8; MouseImpl::SIZE]>,
	consumer: Option<[u8; ConsumerImpl::SIZE]>,
}

#[embassy_executor::task]
async fn hid_task(
	mut keyboard: HidWriter<'static, Driver<'static, USB>, { KeyboardImpl::SIZE }>,
	mut mouse: HidWriter<'static, Driver<'static, USB>, { MouseImpl::SIZE }>,
	mut consumer: HidWriter<'static, Driver<'static, USB>, { ConsumerImpl::SIZE }>,
	update_rx: &'static Signal<ThreadModeRawMutex, HidReport>,
) {
	info!("HID task started.");

	Timer::after_secs(1).await;
	keyboard.ready().await;
	mouse.ready().await;
	consumer.ready().await;

	info!("HID ready.");

	loop {
		let report = update_rx.wait().await;
		let (keyboard_report, mouse_report, consumer_report) =
			(report.keyboard, report.mouse, report.consumer);

		if let Some(keyboard_report) = keyboard_report {
			keyboard.write(&keyboard_report).await.unwrap();

			if keyboard_report.iter().any(|&x| x != 0) {
				info!("Keyboard report: {:?}", keyboard_report);
			}
		}
		if let Some(mouse_report) = mouse_report {
			mouse.write(&mouse_report).await.unwrap();
		}
		if let Some(consumer_report) = consumer_report {
			consumer.write(&consumer_report).await.unwrap();
		}
	}
}

#[embassy_executor::task]
async fn cmd_task(mut ctx: CommandContext, cmds: &'static mut [Box<dyn Command<CommandContext>>]) {
	info!("Serial task started.");

	loop {
		let cmd_id = match ctx.serial_rx.read_u8().await {
			Some(cmd_id) => cmd_id,
			None => {
				continue;
			}
		};
		match read_cmd(cmd_id, cmds, &mut ctx).await {
			Ok(_) => {
				info!("Command {} executed successfully", cmd_id);
			}
			Err(e) => {
				// TODO: DELETE!!!
				if e != "Invalid command ID" {
					break;
				}

				warn!("Error: {}", e);
			}
		}
	}
}

async fn read_cmd(
	cmd_id: u8,
	cmds: &mut [Box<dyn Command<CommandContext>>],
	ctx: &mut CommandContext,
) -> Result<(), &'static str> {
	debug!("Serial message {} received", cmd_id);

	let cmd = match cmds.get_mut(cmd_id as usize) {
		Some(cmd) => cmd,
		None => {
			return Err("Invalid command ID")?;
		}
	};

	cmd.execute(ctx).await
}

#[global_allocator]
static HEAP: Heap = Heap::empty();

fn initialize_allocator() {
	use core::mem::MaybeUninit;
	static mut HEAP_MEM: [MaybeUninit<u8>; HEAP_SIZE] = [MaybeUninit::uninit(); HEAP_SIZE];
	unsafe { HEAP.init(HEAP_MEM.as_ptr() as usize, HEAP_SIZE) }
}

struct UsbDevices {
	keyboard_writer: HidWriter<'static, Driver<'static, USB>, { KeyboardImpl::SIZE }>,
	mouse_writer: HidWriter<'static, Driver<'static, USB>, { MouseImpl::SIZE }>,
	consumer_writer: HidWriter<'static, Driver<'static, USB>, { ConsumerImpl::SIZE }>,
	serial_reader: Receiver<'static, Driver<'static, USB>>,
	serial_writer: embassy_usb::class::cdc_acm::Sender<'static, Driver<'static, USB>>,
	device: UsbDevice<'static, Driver<'static, USB>>,
}

fn init_usb(usb: USB, device_info: &DeviceInfo, serial_number: &'static str) -> UsbDevices {
	let mut config = Config::new(0xF055, 0x6969);
	config.manufacturer = Some(device_info.manufacturer);
	config.product = Some(device_info.name);
	config.serial_number = Some(serial_number);

	let config_descriptor = {
		static BUF: StaticCell<[u8; 256]> = StaticCell::new();
		BUF.init([0; 256])
	};
	let bos_descriptor = {
		static BUF: StaticCell<[u8; 256]> = StaticCell::new();
		BUF.init([0; 256])
	};
	let msos_descriptor = {
		static BUF: StaticCell<[u8; 256]> = StaticCell::new();
		BUF.init([0; 256])
	};
	let control_buf = {
		static BUF: StaticCell<[u8; 256]> = StaticCell::new();
		BUF.init([0; 256])
	};

	let driver = Driver::new(usb, Irqs);

	let mut usb_builder = Builder::new(
		driver,
		config,
		config_descriptor,
		bos_descriptor,
		msos_descriptor,
		control_buf,
	);

	let keyboard_hid_config = embassy_usb::class::hid::Config {
		report_descriptor: KeyboardImpl::report_descriptor(),
		request_handler: None,
		poll_ms: 1,
		max_packet_size: USB_HID_KEYBOARD_PACKET_SIZE as u16,
	};

	let mouse_hid_config = embassy_usb::class::hid::Config {
		report_descriptor: MouseImpl::report_descriptor(),
		request_handler: None,
		poll_ms: 1,
		max_packet_size: USB_HID_MOUSE_PACKET_SIZE as u16,
	};

	let consumer_hid_config = embassy_usb::class::hid::Config {
		report_descriptor: ConsumerImpl::report_descriptor(),
		request_handler: None,
		poll_ms: 1,
		max_packet_size: USB_HID_CONSUMER_PACKET_SIZE as u16,
	};

	let keyboard_writer = {
		static STATE: StaticCell<State> = StaticCell::new();
		let state = STATE.init(State::new());
		HidWriter::new(&mut usb_builder, state, keyboard_hid_config)
	};

	let mouse_writer = {
		static STATE: StaticCell<State> = StaticCell::new();
		let state = STATE.init(State::new());
		HidWriter::new(&mut usb_builder, state, mouse_hid_config)
	};

	let consumer_writer = {
		static STATE: StaticCell<State> = StaticCell::new();
		let state = STATE.init(State::new());
		HidWriter::new(&mut usb_builder, state, consumer_hid_config)
	};

	let serial_class = {
		static STATE: StaticCell<embassy_usb::class::cdc_acm::State> = StaticCell::new();
		let state = STATE.init(embassy_usb::class::cdc_acm::State::new());
		CdcAcmClass::new(&mut usb_builder, state, USB_SERIAL_PACKET_SIZE as u16)
	};
	let (serial_writer, serial_reader) = serial_class.split();
	let usb_device = usb_builder.build();

	UsbDevices {
		keyboard_writer,
		mouse_writer,
		consumer_writer,
		serial_reader,
		serial_writer,
		device: usb_device,
	}
}

struct FlashSetup<ProfileFlash: FlashMemory> {
	profile_flash: ProfileFlash,
}

fn init_flash(
	flash: FLASH,
	dma_ch0: DMA_CH0,
) -> FlashSetup<EmbassyFlashMemory<'static, FLASH_SIZE>> {
	let flash_memory = Flash::<_, Async, FLASH_SIZE>::new(flash, dma_ch0);
	let profile_flash = unsafe {
		EmbassyFlashMemory::new(
			FLASH_ADDR,
			PROFILE.as_ptr() as *const u8,
			PROFILE_SIZE,
			flash_memory,
		)
	};

	FlashSetup { profile_flash }
}

fn create_matrix(
	key_ids: [KeyId; ROWS * COLS],
	row_pins: [AnyPin; ROWS],
	column_pins: [AnyPin; COLS],
) -> KeyMatrix<ROWS, COLS, { ROWS * COLS }> {
	let rows: [Box<dyn RowPin>; ROWS] =
		row_pins.map(|pin| Box::new(Output::new(pin, Level::Low)) as Box<dyn RowPin>);

	let cols: [Box<dyn ColPin>; COLS] =
		column_pins.map(|pin| Box::new(Input::new(pin, Pull::Down)) as Box<dyn ColPin>);

	KeyMatrix::new(key_ids, rows, cols, Duration::from_millis(5))
}
