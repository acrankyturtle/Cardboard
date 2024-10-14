use crate::profile::MouseButton;
use bitflags::bitflags;
use usbd_human_interface_device::device::mouse::WheelMouseReport;

pub struct HidMouseState {
	report: WheelMouseReport,
	cursor: (i32, i32),
	scroll: (i32, i32),
}

impl HidMouseState {
	pub fn new() -> Self {
		HidMouseState {
			report: WheelMouseReport::default(),
			cursor: (0, 0),
			scroll: (0, 0),
		}
	}

	pub fn button_down(&mut self, button: HidMouseButtons) {
		self.report.buttons |= button.bits();
	}

	pub fn button_up(&mut self, button: HidMouseButtons) {
		self.report.buttons &= !button.bits();
	}

	pub fn move_cursor(&mut self, x: i32, y: i32) {
		self.cursor.0 += x;
		self.cursor.1 += y;
	}

	pub fn scroll(&mut self, x: i32, y: i32) {
		self.scroll.0 += x;
		self.scroll.1 += y;
	}

	pub fn clear(&mut self) {
		self.report.buttons = HidMouseButtons::empty().bits();
	}

	pub fn report(&mut self) -> &WheelMouseReport {
		let cursor = (
			self.cursor.0.clamp(-127, 127),
			self.cursor.1.clamp(-127, 127),
		);
		self.cursor.0 -= cursor.0;
		self.cursor.1 -= cursor.1;

		let scroll = (
			self.scroll.0.clamp(-127, 127),
			self.scroll.1.clamp(-127, 127),
		);
		self.scroll.0 -= scroll.0;
		self.scroll.1 -= scroll.1;

		self.report.x = cursor.0 as i8;
		self.report.y = cursor.1 as i8;
		self.report.horizontal_wheel = scroll.0 as i8;
		self.report.vertical_wheel = scroll.1 as i8;

		&self.report
	}
}

impl Default for HidMouseState {
	fn default() -> Self {
		Self::new()
	}
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
