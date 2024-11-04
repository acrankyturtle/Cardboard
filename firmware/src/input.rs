use alloc::string::ToString;
use alloc::vec::Vec;
use defmt::Format;
use embedded_hal::digital::{InputPin, OutputPin};
use rp2040_hal::gpio::{DynPinId, FunctionSioInput, FunctionSioOutput, Pin, PullDown, PullNone};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub struct KeyMatrix<const ROWS: usize, const COLS: usize, const KEY_COUNT: usize> {
	rows: [Pin<DynPinId, FunctionSioOutput, PullNone>; ROWS],
	cols: [Pin<DynPinId, FunctionSioInput, PullDown>; COLS],
	keys: [InputKey; KEY_COUNT],
	debounce_time: u32,
}

impl<const ROWS: usize, const COLS: usize, const KEY_COUNT: usize>
	KeyMatrix<ROWS, COLS, KEY_COUNT>
{
	pub fn new(
		key_ids: [KeyId; KEY_COUNT],
		rows: [Pin<DynPinId, FunctionSioOutput, PullNone>; ROWS],
		cols: [Pin<DynPinId, FunctionSioInput, PullDown>; COLS],
		debounce_time: u32,
	) -> Self {
		assert_eq!(key_ids.len(), ROWS * COLS);
		Self {
			rows,
			cols,
			keys: Self::from_key_ids(key_ids),
			debounce_time: debounce_time * 1000,
		}
	}

	fn from_key_ids<const N: usize>(key_ids: [KeyId; N]) -> [InputKey; N] {
		let mut keys = [InputKey {
			id: KeyId(Uuid::nil()),
			state: KeyState::Released,
			report: KeyState::Released,
			keydown_timestamp: 0,
		}; N];

		for (k, id) in keys.iter_mut().zip(key_ids) {
			*k = InputKey {
				id,
				state: KeyState::Released,
				report: KeyState::Released,
				keydown_timestamp: 0,
			};
		}

		keys
	}

	pub fn read_into(&mut self, out: &mut Vec<KeyboardAction>, time: u32) {
		self.scan(time);

		for k in self.keys.iter_mut() {
			let prev_report = k.report;
			k.update_report(time, self.debounce_time);

			if prev_report != k.report {
				out.push(KeyboardAction {
					action: k.report,
					key_id: k.id,
				});
			}
		}
	}

	fn scan(&mut self, time: u32) {
		for (r, row_pin) in self.rows.iter_mut().enumerate() {
			row_pin.set_high().unwrap();

			for (c, col_pin) in self.cols.iter_mut().enumerate() {
				let i = r * ROWS + c;
				if col_pin.is_high().unwrap() {
					self.keys[i].down(time)
				} else {
					self.keys[i].up()
				}
			}

			row_pin.set_low().unwrap();
		}
	}
}

#[derive(Clone, Copy)]
struct InputKey {
	id: KeyId,
	state: KeyState,
	report: KeyState,
	keydown_timestamp: u32,
}

impl InputKey {
	pub fn down(&mut self, time: u32) {
		if self.state == KeyState::Pressed {
			return;
		}
		self.keydown_timestamp = time;
		self.state = KeyState::Pressed;
	}

	pub fn up(&mut self) {
		self.state = KeyState::Released;
	}

	pub fn update_report(&mut self, time: u32, debounce: u32) {
		self.report = match (self.report, self.state) {
			(KeyState::Pressed, KeyState::Released) => {
				if time.wrapping_sub(self.keydown_timestamp) < debounce {
					// debounce
					KeyState::Pressed
				} else {
					KeyState::Released
				}
			}
			_ => self.state,
		};
	}
}

#[derive(Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct KeyId(Uuid);

impl KeyId {
	pub fn new(id: Uuid) -> Self {
		KeyId(id)
	}
}

impl Format for KeyId {
	fn format(&self, fmt: defmt::Formatter) {
		self.0.to_string().format(fmt);
	}
}

pub struct KeyboardAction {
	pub action: KeyState,
	pub key_id: KeyId,
}

impl KeyboardAction {
	pub fn pressed(key_id: KeyId) -> Self {
		Self {
			action: KeyState::Pressed,
			key_id,
		}
	}

	pub fn released(key_id: KeyId) -> Self {
		Self {
			action: KeyState::Released,
			key_id,
		}
	}
}

#[derive(Clone, Copy, PartialEq, Format)]
pub enum KeyState {
	Pressed,
	Released,
}
