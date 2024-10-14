use alloc::string::ToString;
use alloc::vec::Vec;
use defmt::Format;
use embedded_hal::digital::{InputPin, OutputPin};
use rp2040_hal::gpio::{DynPinId, FunctionSioInput, FunctionSioOutput, Pin, PullDown, PullNone};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub struct InputKeyManager<const RS: usize, const CS: usize> {
	map: InputKeyMap<RS, CS>,
	matrix: InputKeyMatrix<RS, CS>,
	prev_state: [[bool; CS]; RS],
	debounce_time: u32,
}

impl<const RS: usize, const CS: usize> InputKeyManager<RS, CS> {
	pub fn new(
		map: InputKeyMap<RS, CS>,
		matrix: InputKeyMatrix<RS, CS>,
		debounce_time: u8,
	) -> Self {
		Self {
			map,
			matrix,
			prev_state: [[false; CS]; RS],
			debounce_time: debounce_time as u32 * 1000,
		}
	}

	pub fn read_into(&mut self, out: &mut Vec<KeyboardAction>, time: u32) {
		let key_states = self.matrix.read();

		key_states
			.iter()
			// map jagged array into (current, previous, input key)
			.zip(self.prev_state.iter())
			.zip(self.map.keys.iter())
			.flat_map(|((curr_row, prev_row), key_row)| {
				curr_row.iter().zip(prev_row.iter()).zip(key_row.iter())
			})
			// remove unchanged keys
			.filter(|((curr, prev), key)| {
				**curr != **prev && (!(**curr))
					|| time.wrapping_sub(key.last_press) > self.debounce_time
			})
			// map into KeyboardAction
			.map(|((curr, prev), key)| match (curr, prev) {
				(true, false) => KeyboardAction::pressed(key.id),
				(false, true) => KeyboardAction::released(key.id),
				_ => unreachable!(),
			})
			// push actions to output
			.for_each(|action| out.push(action));

		self.prev_state = key_states;
	}
}

pub struct InputKeyMap<const RS: usize, const CS: usize> {
	keys: [[InputKey; CS]; RS],
}

impl<const RS: usize, const CS: usize> InputKeyMap<RS, CS> {
	pub fn new(keys: [[KeyId; CS]; RS]) -> Self {
		Self {
			keys: keys.map(|row| row.map(|id| InputKey { id, last_press: 0 })),
		}
	}
}

struct InputKey {
	id: KeyId,
	last_press: u32,
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
	pub action: KeyboardActionType,
	pub key_id: KeyId,
}

impl KeyboardAction {
	pub fn pressed(key_id: KeyId) -> Self {
		Self {
			action: KeyboardActionType::Pressed,
			key_id,
		}
	}

	pub fn released(key_id: KeyId) -> Self {
		Self {
			action: KeyboardActionType::Released,
			key_id,
		}
	}
}

pub enum KeyboardActionType {
	Pressed,
	Released,
}

pub struct InputKeyMatrix<const RS: usize, const CS: usize> {
	rows: [Pin<DynPinId, FunctionSioOutput, PullNone>; RS],
	cols: [Pin<DynPinId, FunctionSioInput, PullDown>; CS],
}

impl<const RS: usize, const CS: usize> InputKeyMatrix<RS, CS> {
	pub fn new(
		rows: [Pin<DynPinId, FunctionSioOutput, PullNone>; RS],
		cols: [Pin<DynPinId, FunctionSioInput, PullDown>; CS],
	) -> Self {
		Self { rows, cols }
	}

	pub fn read(&mut self) -> [[bool; CS]; RS] {
		let mut results = [[false; CS]; RS];

		for (row_pin, row_results) in self.rows.iter_mut().zip(results.iter_mut()) {
			row_pin.set_high().unwrap();

			for (col_pin, result) in self.cols.iter_mut().zip(row_results.iter_mut()) {
				*result = col_pin.is_high().unwrap();
			}

			row_pin.set_low().unwrap();
		}

		results
	}
}
