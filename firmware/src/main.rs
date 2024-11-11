#![no_std]
#![no_main]

extern crate alloc;
extern crate usbd_human_interface_device;

use core::fmt::Display;
use core::iter::Product;
use core::mem::MaybeUninit;
use core::ops::{Add, Mul};
use core::task::Context;

use crate::debug_assert;
use alloc::borrow::ToOwned;
use alloc::boxed::Box;
use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;
use bsp::entry;
use bsp::hal;
use cardboard::command::{
	Command, CommandInfo, CommandList, DeviceId, IdentifyCommand, SetProfileCommand,
};
use cardboard::context::{ContextCurrentProfile, ContextHidState, ContextSerialPort, Device};
use cardboard::device::DeviceSetup;
use cardboard::hid::{
	map_button, map_cc, map_key, HidCCState, HidKeyboardState, HidMouseState, HidState,
};
use cardboard::input;
use cardboard::input::KeyId;
use cardboard::input::KeyMatrix;
use cardboard::profile::KeyboardEvent;
use cardboard::profile::KeyboardProfile;
use cardboard::profile::{ActionEvent, MouseEvent};
use cardboard::state::{CurrentProfile, KeyboardState};
use cardboard::storage::{FlashStorage, ProfileFlashStorage, ProfileStorage};
use cortex_m::prelude::*;
use defmt::*;
use defmt_rtt as _;
use embedded_hal::digital::OutputPin;
use fugit::ExtU32;
use generic_array::typenum::Unsigned;
use generic_array::{ArrayLength, GenericArray};
use hal::pac;
use littlefs2::driver::Storage;
use littlefs2::fs::Filesystem;
use littlefs2::io::Result;
use littlefs2::io::SeekFrom;
use littlefs2::path::PathBuf;
use littlefs2::{driver, ram_storage};
use panic_probe as _;
use rp2040_hal::rom_data::memcpy;
use serde::Deserialize;
use serde::Serialize;
use typenum::{U10, U1024};
use usb_device::class_prelude::*;
use usb_device::prelude::*;
use usbd_human_interface_device::prelude::*;
use usbd_serial::embedded_io::ReadReady;
use usbd_serial::{DefaultBufferStore, SerialPort, USB_CLASS_CDC};
use uuid::uuid;

// Provide an alias for our BSP so we can switch targets quickly.
use rp_pico as bsp;

use embedded_alloc::LlffHeap as Heap;
use uuid::Uuid;

// profile storage
#[link_section = ".profile"]
static mut PROFILE: MaybeUninit<GenericArray<u8, PROFILE_SIZE>> = MaybeUninit::uninit();
type PROFILE_SIZE = <U1024 as Mul<U10>>::Output;

// device specific
const HEAP_SIZE: usize = 4096;

// matrix
const ROWS: usize = 5;
const COLS: usize = 5;
const SIZE: usize = ROWS * COLS;

#[entry]
fn main() -> ! {
	info!("Program start");
	initialize_allocator();

	let (device_info, cmds) = DeviceSetup {
		id: DeviceId::new(Uuid::from_u128(0xd6875554_8cb4_5a57_b81f_70e91a6b7841)),
		name: "Cardboard",
		manufacturer: "cranky",
		commands: [IdentifyCommand::instance(), SetProfileCommand::instance()],
	}
	.build();

	let mut pac = pac::Peripherals::take().unwrap();
	let core = pac::CorePeripherals::take().unwrap();
	let mut watchdog = hal::Watchdog::new(pac.WATCHDOG);
	let sio = hal::Sio::new(pac.SIO);

	// External high-speed crystal on the pico board is 12Mhz
	let external_xtal_freq_hz = 12_000_000u32;
	let clocks = hal::clocks::init_clocks_and_plls(
		external_xtal_freq_hz,
		pac.XOSC,
		pac.CLOCKS,
		pac.PLL_SYS,
		pac.PLL_USB,
		&mut pac.RESETS,
		&mut watchdog,
	)
	.ok()
	.unwrap();

	let timer = hal::Timer::new(pac.TIMER, &mut pac.RESETS, &clocks);

	let pins = bsp::Pins::new(
		pac.IO_BANK0,
		pac.PADS_BANK0,
		sio.gpio_bank0,
		&mut pac.RESETS,
	);

	// debug
	//let mut led_pin = pins.led.into_push_pull_output();

	// set up usb
	let usb_bus = UsbBusAllocator::new(hal::usb::UsbBus::new(
		pac.USBCTRL_REGS,
		pac.USBCTRL_DPRAM,
		clocks.usb_clock,
		true,
		&mut pac.RESETS,
	));

	let mut hid_keyboard = UsbHidClassBuilder::new()
		.add_device(
			usbd_human_interface_device::device::keyboard::NKROBootKeyboardConfig::default(),
		)
		.build(&usb_bus);

	let mut hid_mouse = UsbHidClassBuilder::new()
		.add_device(usbd_human_interface_device::device::mouse::WheelMouseConfig::default())
		.build(&usb_bus);

	let mut hid_consumer = UsbHidClassBuilder::new()
		.add_device(usbd_human_interface_device::device::consumer::ConsumerControlConfig::default())
		.build(&usb_bus);

	let hid_state = HidState {
		keyboard: HidKeyboardState::new(),
		mouse: HidMouseState::new(),
		consumer: HidCCState::new(),
	};

	let serial_port = SerialPort::new_with_store(&usb_bus, [0u8; 256], [0u8; 256]);

	let serial_number: String = device_info.id.to_string();

	// device setup
	let mut usb_dev = UsbDeviceBuilder::new(&usb_bus, UsbVidPid(0xF055, 0x6969))
		.strings(&[StringDescriptors::default()
			.manufacturer(device_info.manufacturer)
			.product(device_info.name)
			.serial_number(serial_number.as_str())])
		.unwrap()
		.composite_with_iads()
		.build();

	let mut input_keys: KeyMatrix<ROWS, COLS, SIZE> = input::KeyMatrix::new(
		[
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
		],
		[
			pins.gpio28
				.into_push_pull_output()
				.into_pull_type()
				.into_dyn_pin(),
			pins.gpio27
				.into_push_pull_output()
				.into_pull_type()
				.into_dyn_pin(),
			pins.gpio26
				.into_push_pull_output()
				.into_pull_type()
				.into_dyn_pin(),
			pins.gpio22
				.into_push_pull_output()
				.into_pull_type()
				.into_dyn_pin(),
			pins.gpio21
				.into_push_pull_output()
				.into_pull_type()
				.into_dyn_pin(),
		],
		[
			pins.gpio20.into_pull_down_input().into_dyn_pin(),
			pins.gpio19.into_pull_down_input().into_dyn_pin(),
			pins.gpio18.into_pull_down_input().into_dyn_pin(),
			pins.gpio17.into_pull_down_input().into_dyn_pin(),
			pins.gpio16.into_pull_down_input().into_dyn_pin(),
		],
		5,
	);

	// // may use common `OpenOptions`
	// let mut buf = [0u8; 11];
	// fs.open_file_with_options_and_then(
	// 	|options| options.read(true).write(true).create(true),
	// 	&PathBuf::from(b"example.txt"),
	// 	|file| {
	// 		file.write(b"Why is black smoke coming out?!")?;
	// 		file.seek(SeekFrom::End(-24)).unwrap();
	// 		file.read(&mut buf).unwrap();
	// 		Ok(())
	// 	},
	// )
	// .unwrap();

	// info!("buf: {:?}", buf);

	const DEFAULT_PROFILE_JSON: &str = r#"
	{
		"keys": [
			{
				"id": "0661ee85-348b-5d93-b5e2-ac11cfa5344b",
				"layers": [],
				"default_layer": {
					"id": "4019527f-fc18-5a66-83a8-8e1b4f5b5775",
					"macros": [
						{
							"id": "50f04f39-e2ff-5bce-a4b7-9d234fcc5078",
							"name": "Test",
							"play_channel": null,
							"cut_channels": [],
							"start_sequence": {
								"actions": [
									{
										"predelay_ms": 0,
										"action_event": {
											"Keyboard": {
												"KeyDown": "A"
											}
										}
									}
								]
							},
							"loop_sequence": {
								"actions": []
							},
							"end_sequence": {
								"actions": [
									{
										"predelay_ms": 0,
										"action_event": {
											"Keyboard": {
												"KeyUp": "A"
											}
										}
									}
								]
							}
						}
					]
				}
			}
		]
	}
	"#;

	// let ptr = unsafe { PROFILE.as_ptr() };
	// let first = unsafe { (*ptr).as_ptr() };
	// let mut buf = [0u8; 256];
	// unsafe { memcpy(buf.as_mut_ptr(), first, 256) };

	let profile_storage = FlashStorage::<PROFILE_SIZE>::new(unsafe { PROFILE.assume_init_ref() });

	let macro_profile = serde_json_core::from_slice(profile_storage.get())
		.map(|(profile, _)| profile)
		.unwrap_or_else(|_| {
			warn!("No profile found");
			KeyboardProfile::default()
		});

	// // must format before first mount
	// Filesystem::format(&mut storage).unwrap();
	// info!("Formatted");
	// // must allocate state statically before use
	// let mut alloc = Filesystem::allocate();
	// info!("Allocated");
	// let mut fs = Filesystem::mount(&mut alloc, &mut storage).unwrap();
	// info!("Mounted");

	// let (macro_profile, _) =
	// 	serde_json_core::from_str::<KeyboardProfile>(DEFAULT_PROFILE_JSON).unwrap();

	let current_profile = CurrentProfile::from(macro_profile);

	let mut key_actions = Vec::with_capacity(SIZE);
	let mut macro_events = Vec::with_capacity(16);

	let mut ctx = Device {
		device_info,
		profile_storage,
		current_profile,
		serial_port,
		hid: hid_state,
	};

	let mut tick = timer.count_down();
	tick.start(1.millis());

	let mut prev_macro_tick = timer.get_counter_low();

	info!("Ready");

	loop {
		if tick.wait().is_err() {
			continue;
		}

		// read key matrix and update macro state with results
		let now = timer.get_counter_low();
		key_actions.clear();
		input_keys.read_into(&mut key_actions, now);
		for key in key_actions.iter() {
			match key.action {
				input::KeyState::Pressed => {
					ctx.get_current_profile().press_key(key.key_id);
				}
				input::KeyState::Released => {
					ctx.get_current_profile().release_key(key.key_id);
				}
			}
		}

		// tick macros
		let now = timer.get_counter_low();
		let dt = now.wrapping_sub(prev_macro_tick) / 1000;
		prev_macro_tick = now;
		macro_events.clear();
		ctx.get_current_profile().tick(dt, &mut macro_events);

		// process each macro event and update hid states
		for macro_event in macro_events.iter() {
			match macro_event {
				ActionEvent::DebugLog(event) => {
					info!("Debug event: {:?}", event.message.as_str())
				}
				ActionEvent::None => {}
				ActionEvent::Keyboard(event) => match event {
					KeyboardEvent::KeyDown(key) => {
						ctx.get_hid_state().keyboard.key_down(map_key(key));
					}
					KeyboardEvent::KeyUp(key) => {
						ctx.get_hid_state().keyboard.key_up(map_key(key));
					}
				},
				ActionEvent::Mouse(event) => match event {
					MouseEvent::Move(event) => {
						ctx.get_hid_state().mouse.move_cursor(event.x, event.y);
					}
					MouseEvent::Scroll(event) => {
						ctx.get_hid_state().mouse.scroll(event.x, event.y);
					}
					MouseEvent::ButtonDown(button) => {
						ctx.get_hid_state().mouse.button_down(map_button(button));
					}
					MouseEvent::ButtonUp(button) => {
						ctx.get_hid_state().mouse.button_up(map_button(button));
					}
				},
				ActionEvent::ConsumerControl(event) => {
					ctx.get_hid_state().consumer.key_down(map_cc(event));
				}
				ActionEvent::Layer(_) => {}
			}
		}

		// convert hid states to reports and send
		hid_keyboard
			.device()
			.write_report(ctx.get_hid_state().keyboard.keys().iter().copied())
			.ok();
		hid_mouse
			.device()
			.write_report(ctx.get_hid_state().mouse.report())
			.ok();
		hid_consumer
			.device()
			.write_report(&ctx.get_hid_state().consumer.report())
			.ok();

		_ = usb_dev.poll(&mut [
			&mut hid_keyboard,
			&mut hid_mouse,
			&mut hid_consumer,
			ctx.get_serial_port(),
		]);

		if ctx.get_serial_port().read_ready().unwrap_or(false) {
			debug!("Serial message received");
			if cmds.run_command(&mut ctx).is_err() {
				error!("Failed to execute command");
			};
		}
	}
}

#[global_allocator]
static HEAP: Heap = Heap::empty();

fn initialize_allocator() {
	use core::mem::MaybeUninit;
	static mut HEAP_MEM: [MaybeUninit<u8>; HEAP_SIZE] = [MaybeUninit::uninit(); HEAP_SIZE];
	unsafe { HEAP.init(HEAP_MEM.as_ptr() as usize, HEAP_SIZE) }
}
