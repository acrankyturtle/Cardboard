use cardboard_lib::hid::HidReport;
use defmt::{info, warn};
use embassy_rp::{peripherals::USB, usb::Driver};
use embassy_sync::{blocking_mutex::raw::RawMutex, signal::Signal};
use embassy_time::Timer;
use embassy_usb::class::hid::HidWriter;

pub async fn hid_task<
	Mutex: RawMutex,
	const KEYBOARD_PACKET_SIZE: usize,
	const MOUSE_PACKET_SIZE: usize,
	const CONSUMER_PACKET_SIZE: usize,
	const GAMEPAD_PACKET_SIZE: usize,
>(
	mut keyboard: HidWriter<'static, Driver<'static, USB>, KEYBOARD_PACKET_SIZE>,
	mut mouse: Option<HidWriter<'static, Driver<'static, USB>, MOUSE_PACKET_SIZE>>,
	mut consumer: HidWriter<'static, Driver<'static, USB>, CONSUMER_PACKET_SIZE>,
	mut gamepad: Option<HidWriter<'static, Driver<'static, USB>, GAMEPAD_PACKET_SIZE>>,
	signal: &'static Signal<
		Mutex,
		HidReport<
			KEYBOARD_PACKET_SIZE,
			MOUSE_PACKET_SIZE,
			CONSUMER_PACKET_SIZE,
			GAMEPAD_PACKET_SIZE,
		>,
	>,
) {
	info!("HID task started.");

	Timer::after_secs(1).await;
	keyboard.ready().await;
	if let Some(mouse) = &mut mouse {
		mouse.ready().await;
	}
	consumer.ready().await;
	if let Some(gamepad) = &mut gamepad {
		gamepad.ready().await;
	}

	info!("HID ready.");

	loop {
		let report: HidReport<
			KEYBOARD_PACKET_SIZE,
			MOUSE_PACKET_SIZE,
			CONSUMER_PACKET_SIZE,
			GAMEPAD_PACKET_SIZE,
		> = signal.wait().await;
		if let Some(keyboard_report) = report.keyboard {
			let result = keyboard.write(&keyboard_report[..]).await;
			if let Err(e) = result {
				warn!("Error writing keyboard report: {:?}", e);
			}
		}
		if let (Some(mouse), Some(mouse_report)) = (&mut mouse, report.mouse) {
			let result = mouse.write(&mouse_report[..]).await;
			if let Err(e) = result {
				warn!("Error writing mouse report: {:?}", e);
			}
		}
		if let Some(consumer_report) = report.consumer {
			let result = consumer.write(&consumer_report[..]).await;
			if let Err(e) = result {
				warn!("Error writing consumer report: {:?}", e);
			}
		}
		if let (Some(gamepad), Some(gamepad_report)) = (&mut gamepad, report.gamepad) {
			let result = gamepad.write(&gamepad_report[..]).await;
			if let Err(e) = result {
				warn!("Error writing gamepad report: {:?}", e);
			}
		}
	}
}
