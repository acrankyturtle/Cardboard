use crate::profile::{ConsumerControlEvent, KeyboardEvent, KeyboardKey, MouseButton, MouseEvent};
use bitflags::bitflags;
use cardboard_lib::input::KeyState;
use usbd_human_interface_device::page::Consumer;

pub trait HidDevice<I, const SIZE: usize> {
	fn create_report(&mut self) -> Option<[u8; SIZE]>;

	fn input(&mut self, input: &I);

	fn reset(&mut self);

	fn report_descriptor() -> &'static [u8];

	const SIZE: usize;
}
pub struct NKROKeyboard {
	state: [u8; NKROKeyboard::REPORT_SIZE],
}

impl NKROKeyboard {
	const REPORT_SIZE: usize = 17;
	pub fn new() -> Self {
		NKROKeyboard {
			state: [0; NKROKeyboard::REPORT_SIZE],
		}
	}
}

impl HidDevice<KeyboardEvent, { NKROKeyboard::REPORT_SIZE }> for NKROKeyboard {
	fn create_report(&mut self) -> Option<[u8; NKROKeyboard::REPORT_SIZE]> {
		let mut report = [0; NKROKeyboard::REPORT_SIZE];
		report.copy_from_slice(&self.state);
		Some(report)
	}

	fn input(&mut self, input: &KeyboardEvent) {
		let (key, state) = match input {
			KeyboardEvent::KeyDown(k) => (k, KeyState::Pressed),
			KeyboardEvent::KeyUp(k) => (k, KeyState::Released),
		};

		let keycode = *key as u8;

		if (0xE0..=0xE7).contains(&keycode) {
			let modifiers: u8 = match key {
				KeyboardKey::LEFT_CONTROL => 1 << 0,
				KeyboardKey::LEFT_SHIFT => 1 << 1,
				KeyboardKey::LEFT_ALT => 1 << 2,
				KeyboardKey::LEFT_GUI => 1 << 3,
				KeyboardKey::RIGHT_CONTROL => 1 << 4,
				KeyboardKey::RIGHT_SHIFT => 1 << 5,
				KeyboardKey::RIGHT_ALT => 1 << 6,
				KeyboardKey::RIGHT_GUI => 1 << 7,
				_ => 0,
			};

			match state {
				KeyState::Pressed => {
					self.state[0] |= modifiers;
				}
				KeyState::Released => {
					self.state[0] &= !modifiers;
				}
			}

			return;
		}

		let byte_index = (keycode / 8) as usize + 1; // skip modifier byte
		let bit_index = (keycode % 8) as usize;

		match state {
			KeyState::Pressed => {
				self.state[byte_index] |= 1 << bit_index;
			}
			KeyState::Released => {
				self.state[byte_index] &= !(1 << bit_index);
			}
		}
	}

	fn reset(&mut self) {
		self.state = [0; NKROKeyboard::REPORT_SIZE];
	}

	fn report_descriptor() -> &'static [u8] {
		&[
			0x05, 0x01, // Usage Page (Generic Desktop)
			0x09, 0x06, // Usage (Keyboard)
			0xA1, 0x01, // Collection (Application)
			// Modifier byte (8 bits for Left Ctrl to Right GUI)
			0x75, 0x01, //   Report Size (1)
			0x95, 0x08, //   Report Count (8)
			0x05, 0x07, //   Usage Page (Key Codes)
			0x19, 0xE0, //   Usage Minimum (224: Left Control)
			0x29, 0xE7, //   Usage Maximum (231: Right GUI)
			0x15, 0x00, //   Logical Minimum (0)
			0x25, 0x01, //   Logical Maximum (1)
			0x81, 0x02, //   Input (Data, Variable, Absolute)
			// Key bitmap (16 bytes = 128 keys)
			0x75, 0x01, //   Report Size (1)
			0x95, 0x80, //   Report Count (128 bits = 16 bytes)
			0x05, 0x07, //   Usage Page (Key Codes)
			0x19, 0x00, //   Usage Minimum (0)
			0x29, 0x7F, //   Usage Maximum (127)
			0x15, 0x00, //   Logical Minimum (0)
			0x25, 0x01, //   Logical Maximum (1)
			0x81, 0x02, //   Input (Data, Variable, Absolute)
			// LED output report (5 LEDs + 3 padding bits)
			0x75, 0x01, //   Report Size (1)
			0x95, 0x05, //   Report Count (5)
			0x05, 0x08, //   Usage Page (LEDs)
			0x19, 0x01, //   Usage Minimum (1: Num Lock)
			0x29, 0x05, //   Usage Maximum (5: Kana)
			0x91, 0x02, //   Output (Data, Variable, Absolute)
			0x75, 0x03, //   Report Size (3)
			0x95, 0x01, //   Report Count (1)
			0x91, 0x03, //   Output (Constant)
			0xC0, // End Collection
		]
	}

	const SIZE: usize = NKROKeyboard::REPORT_SIZE;
}

pub struct Mouse {
	buttons: HidMouseButtons,
	cursor: (i32, i32),
	scroll: (i32, i32),
}

impl Mouse {
	const REPORT_SIZE: usize = 5;

	pub fn new() -> Self {
		Mouse {
			buttons: HidMouseButtons::empty(),
			cursor: (0, 0),
			scroll: (0, 0),
		}
	}

	fn button_down(&mut self, button: HidMouseButtons) {
		self.buttons |= button;
	}

	fn button_up(&mut self, button: HidMouseButtons) {
		self.buttons &= !button;
	}

	fn move_cursor(&mut self, x: i32, y: i32) {
		self.cursor.0 += x;
		self.cursor.1 += y;
	}

	fn scroll(&mut self, x: i32, y: i32) {
		self.scroll.0 += x;
		self.scroll.1 += y;
	}
}

impl HidDevice<MouseEvent, { Mouse::REPORT_SIZE }> for Mouse {
	fn create_report(&mut self) -> Option<[u8; Mouse::REPORT_SIZE]> {
		let buttons = self.buttons.bits();
		let x = self.cursor.0.clamp(-128, 127) as i8;
		let y = self.cursor.1.clamp(-128, 127) as i8;
		let scroll_x = self.scroll.0.clamp(-128, 127) as i8;
		let scroll_y = self.scroll.1.clamp(-128, 127) as i8;

		Some([buttons, x as u8, y as u8, scroll_x as u8, scroll_y as u8])
	}

	fn input(&mut self, input: &MouseEvent) {
		match input {
			MouseEvent::ButtonDown(button) => self.button_down(map_button(button)),
			MouseEvent::ButtonUp(button) => self.button_up(map_button(button)),
			MouseEvent::Move(m) => self.move_cursor(m.x, m.y),
			MouseEvent::Scroll(s) => self.scroll(s.x, s.y),
		}
	}

	fn reset(&mut self) {
		*self = Mouse::new();
	}

	fn report_descriptor() -> &'static [u8] {
		&[
			0x05, 0x01, // Usage Page (Generic Desktop)
			0x09, 0x02, // Usage (Mouse)
			0xA1, 0x01, // Collection (Application)
			0x09, 0x01, //   Usage (Pointer)
			0xA1, 0x00, //   Collection (Physical)
			// Buttons (5 buttons supported)
			0x05, 0x09, //     Usage Page (Button)
			0x19, 0x01, //     Usage Minimum (Button 1)
			0x29, 0x05, //     Usage Maximum (Button 5)
			0x15, 0x00, //     Logical Minimum (0)
			0x25, 0x01, //     Logical Maximum (1)
			0x95, 0x05, //     Report Count (5)
			0x75, 0x01, //     Report Size (1)
			0x81, 0x02, //     Input (Data, Variable, Absolute)
			0x95, 0x03, //     Report Count (3)
			0x75, 0x01, //     Report Size (1)
			0x81, 0x03, //     Input (Constant) - Padding
			// X and Y Axes
			0x05, 0x01, //     Usage Page (Generic Desktop)
			0x09, 0x30, //     Usage (X)
			0x09, 0x31, //     Usage (Y)
			0x15, 0x81, //     Logical Minimum (-127)
			0x25, 0x7F, //     Logical Maximum (127)
			0x75, 0x08, //     Report Size (8)
			0x95, 0x02, //     Report Count (2)
			0x81, 0x06, //     Input (Data, Variable, Relative)
			// Vertical Wheel
			0x09, 0x38, //     Usage (Wheel)
			0x15, 0x81, //     Logical Minimum (-127)
			0x25, 0x7F, //     Logical Maximum (127)
			0x75, 0x08, //     Report Size (8)
			0x95, 0x01, //     Report Count (1)
			0x81, 0x06, //     Input (Data, Variable, Relative)
			// Horizontal Wheel
			0x09, 0x48, //     Usage (Horizontal Wheel)
			0x15, 0x81, //     Logical Minimum (-127)
			0x25, 0x7F, //     Logical Maximum (127)
			0x75, 0x08, //     Report Size (8)
			0x95, 0x01, //     Report Count (1)
			0x81, 0x06, //     Input (Data, Variable, Relative)
			0xC0, //   End Collection
			0xC0, // End Collection
		]
	}

	const SIZE: usize = Mouse::REPORT_SIZE;
}

pub fn map_button(key: &MouseButton) -> HidMouseButtons {
	match key {
		MouseButton::Left => HidMouseButtons::LEFT,
		MouseButton::Right => HidMouseButtons::RIGHT,
		MouseButton::Middle => HidMouseButtons::MIDDLE,
		MouseButton::Back => HidMouseButtons::BACK,
		MouseButton::Forward => HidMouseButtons::FORWARD,
	}
}

bitflags! {
	pub struct HidMouseButtons: u8 {
		const LEFT = 0b00000001;
		const RIGHT = 0b00000010;
		const MIDDLE = 0b00000100;
		const BACK = 0b00001000;
		const FORWARD = 0b00010000;
	}
}

const CONSUMER_CONTROL_REPORT_SIZE: usize = 32;

pub struct ConsumerControl {
	state: Option<[u8; CONSUMER_CONTROL_REPORT_SIZE]>,
}

impl ConsumerControl {
	pub fn new() -> Self {
		ConsumerControl { state: None }
	}

	fn get_state_or_new(&mut self) -> &mut [u8; CONSUMER_CONTROL_REPORT_SIZE] {
		self.state.get_or_insert([0; CONSUMER_CONTROL_REPORT_SIZE])
	}
}

impl HidDevice<ConsumerControlEvent, CONSUMER_CONTROL_REPORT_SIZE> for ConsumerControl {
	fn create_report(&mut self) -> Option<[u8; CONSUMER_CONTROL_REPORT_SIZE]> {
		match self.state {
			Some(state) => {
				let mut report = [0; CONSUMER_CONTROL_REPORT_SIZE];
				report.copy_from_slice(&state);
				self.reset(); // cc device should be reset after generating a report
				Some(report)
			}
			None => None,
		}
	}

	fn input(&mut self, input: &ConsumerControlEvent) {
		let state = self.get_state_or_new();

		let cc = map_cc(input);
		let usage = cc as u8;

		let byte_index = (usage / 8) as usize;
		let bit_index = (usage % 8) as usize;
		state[byte_index] |= 1 << bit_index;
	}

	fn reset(&mut self) {
		self.state = None;
	}

	fn report_descriptor() -> &'static [u8] {
		&[
			0x05, 0x0C, // Usage Page (Consumer)
			0x09, 0x01, // Usage (Consumer Control)
			0xA1, 0x01, // Collection (Application)
			// Bitmap for Consumer Usages (256 possible usages, 32 bytes)
			0x19, 0x00, // Usage Minimum (0)
			0x2A, 0xFF, 0x00, // Usage Maximum (255) - 16-bit due to consumer page range
			0x15, 0x00, // Logical Minimum (0)
			0x25, 0x01, // Logical Maximum (1)
			0x75, 0x01, // Report Size (1)
			0x95, 0x00, // Report Count (256)
			0x81, 0x02, // Input (Data, Variable, Absolute) - Consumer bitmap
			0xC0, // End Collection
		]
	}

	const SIZE: usize = CONSUMER_CONTROL_REPORT_SIZE;
}

pub fn map_cc(key: &ConsumerControlEvent) -> Consumer {
	match key {
		ConsumerControlEvent::RECORD => Consumer::Record,
		ConsumerControlEvent::FAST_FORWARD => Consumer::FastForward,
		ConsumerControlEvent::REWIND => Consumer::Rewind,
		ConsumerControlEvent::SCAN_NEXT_TRACK => Consumer::ScanNextTrack,
		ConsumerControlEvent::SCAN_PREVIOUS_TRACK => Consumer::ScanPreviousTrack,
		ConsumerControlEvent::STOP => Consumer::Stop,
		ConsumerControlEvent::EJECT => Consumer::Eject,
		ConsumerControlEvent::PLAY_PAUSE => Consumer::PlayPause,
		ConsumerControlEvent::MUTE => Consumer::Mute,
		ConsumerControlEvent::VOLUME_DECREMENT => Consumer::VolumeDecrement,
		ConsumerControlEvent::VOLUME_INCREMENT => Consumer::VolumeIncrement,
	}
}
