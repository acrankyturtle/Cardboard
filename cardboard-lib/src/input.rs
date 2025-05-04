use alloc::boxed::Box;
use alloc::string::ToString;
use alloc::vec::Vec;
use embassy_time::Duration;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[cfg(not(test))]
use defmt::Format;
#[cfg(all(not(test), feature = "embassy"))]
use embassy_rp::gpio::{Input, Output};

pub trait RowPin {
	fn set_high(&mut self);
	fn set_low(&mut self);
}

pub trait ColPin {
	fn is_high(&self) -> bool;
}

#[cfg(all(not(test), feature = "embassy"))]
impl RowPin for Output<'_> {
	fn set_high(&mut self) {
		self.set_high();
	}

	fn set_low(&mut self) {
		self.set_low();
	}
}

#[cfg(all(not(test), feature = "embassy"))]
impl ColPin for Input<'_> {
	fn is_high(&self) -> bool {
		self.is_high()
	}
}

pub struct KeyMatrix<const ROWS: usize, const COLS: usize, const KEY_COUNT: usize> {
	rows: [Box<dyn RowPin>; ROWS],
	cols: [Box<dyn ColPin>; COLS],
	keys: [InputKey; KEY_COUNT],
}

impl<const ROWS: usize, const COLS: usize, const KEY_COUNT: usize>
	KeyMatrix<ROWS, COLS, KEY_COUNT>
{
	pub fn new(
		key_ids: [KeyId; KEY_COUNT],
		rows: [Box<dyn RowPin>; ROWS],
		cols: [Box<dyn ColPin>; COLS],
		debounce_time: Duration,
	) -> Self {
		assert_eq!(key_ids.len(), ROWS * COLS);
		Self {
			rows,
			cols,
			keys: key_ids.map(|key_id| InputKey {
				id: key_id,
				prev_actual_state: KeyState::Released,
				reported_state: KeyState::Released,
				prev_reported_state: KeyState::Released,
				keydown_time: Duration::from_millis(0),
				debounce_time,
			}),
		}
	}

	pub fn update(&mut self, dt: Duration, output: &mut Vec<KeyboardAction>) {
		for (r, row_pin) in self.rows.iter_mut().enumerate() {
			row_pin.set_high();

			for (c, col_pin) in self.cols.iter_mut().enumerate() {
				let state = match col_pin.is_high() {
					true => KeyState::Pressed,
					false => KeyState::Released,
				};
				let key = self.keys.get_mut(r * ROWS + c).unwrap();
				let event = key.update(state, dt);

				if let Some(event) = event {
					output.push(KeyboardAction {
						action: event,
						key_id: key.id,
					});
				}
			}

			row_pin.set_low();
		}
	}
}

pub struct InputKey {
	id: KeyId,
	prev_actual_state: KeyState,
	reported_state: KeyState,
	prev_reported_state: KeyState,
	keydown_time: Duration,
	debounce_time: Duration,
}

impl InputKey {
	pub fn id(&self) -> KeyId {
		self.id
	}

	pub fn update(&mut self, state: KeyState, dt: Duration) -> Option<KeyState> {
		let prev_actual_state = self.prev_actual_state;
		self.prev_reported_state = self.reported_state;

		match (prev_actual_state, state) {
			(KeyState::Released, KeyState::Pressed) => {
				if self.prev_reported_state == KeyState::Released {
					self.keydown_time = Duration::from_millis(0);
				}
				self.prev_actual_state = KeyState::Pressed;
			}
			(KeyState::Pressed, KeyState::Released) => {
				// self.keydown_time = Duration::from_millis(0); // probably unnecessary
				self.prev_actual_state = KeyState::Released;
			}
			_ => {
				self.keydown_time += dt;
			}
		}

		self.reported_state = match (self.reported_state, self.prev_actual_state) {
			(KeyState::Pressed, KeyState::Released) => {
				if self.keydown_time < self.debounce_time {
					// debouncing
					KeyState::Pressed
				} else {
					KeyState::Released
				}
			}
			_ => self.prev_actual_state,
		};

		if self.prev_reported_state != self.reported_state {
			Some(self.reported_state)
		} else {
			None
		}
	}
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct KeyId(Uuid);

impl KeyId {
	pub fn new(id: Uuid) -> Self {
		KeyId(id)
	}
}

#[cfg(not(test))]
impl Format for KeyId {
	fn format(&self, fmt: defmt::Formatter) {
		self.0.to_string().format(fmt);
	}
}

#[derive(Debug, Clone, Copy)]
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

impl Default for KeyboardAction {
	fn default() -> Self {
		Self {
			action: KeyState::Released,
			key_id: KeyId(Uuid::nil()),
		}
	}
}

#[derive(Debug, Clone, Copy, PartialEq)]
#[cfg_attr(not(test), derive(Format))]
pub enum KeyState {
	Pressed,
	Released,
}

#[cfg(test)]
mod tests {
	use alloc::rc::Rc;
	use core::cell::RefCell;

	use super::*;

	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _embassy_time_now() -> u64 {
		// Return a fake timestamp (e.g., milliseconds since epoch)
		std::time::SystemTime::now()
			.duration_since(std::time::UNIX_EPOCH)
			.unwrap()
			.as_millis() as u64
	}

	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _embassy_time_schedule_wake(_at: u64) {
		// No-op: no real scheduling needed in tests
	}

	#[test]
	fn key_same_state_returns_none() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Released,
			reported_state: KeyState::Released,
			prev_reported_state: KeyState::Released,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(0),
		};

		let result = input_key.update(KeyState::Released, Duration::from_millis(1));

		assert_eq!(result, None);
	}

	#[test]
	fn key_pressed_returns_pressed() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Released,
			reported_state: KeyState::Released,
			prev_reported_state: KeyState::Released,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(0),
		};

		let result = input_key.update(KeyState::Pressed, Duration::from_millis(1));

		assert_eq!(result, Some(KeyState::Pressed));
	}

	#[test]
	fn key_released_returns_released() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Pressed,
			reported_state: KeyState::Pressed,
			prev_reported_state: KeyState::Pressed,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(0),
		};

		let result = input_key.update(KeyState::Released, Duration::from_millis(1));

		assert_eq!(result, Some(KeyState::Released));
	}

	#[test]
	fn key_pressed_and_released_returns_released() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Released,
			reported_state: KeyState::Released,
			prev_reported_state: KeyState::Released,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(0),
		};

		_ = input_key.update(KeyState::Pressed, Duration::from_millis(1));
		let result = input_key.update(KeyState::Released, Duration::from_millis(1));

		assert_eq!(result, Some(KeyState::Released));
	}

	#[test]
	fn key_held_returns_no_actions() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Pressed,
			reported_state: KeyState::Pressed,
			prev_reported_state: KeyState::Pressed,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(0),
		};
		let result = input_key.update(KeyState::Pressed, Duration::from_millis(1));

		assert_eq!(result, None);
	}

	#[test]
	fn key_held_no_dt_returns_no_actions() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Pressed,
			reported_state: KeyState::Pressed,
			prev_reported_state: KeyState::Pressed,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(0),
		};
		let result = input_key.update(KeyState::Pressed, Duration::from_millis(0));

		assert_eq!(result, None);
	}

	#[test]
	fn key_press_and_release_is_debounced() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Released,
			reported_state: KeyState::Released,
			prev_reported_state: KeyState::Released,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(5),
		};
		_ = input_key.update(KeyState::Pressed, Duration::from_millis(0));
		let result = input_key.update(KeyState::Released, Duration::from_millis(1));

		assert_eq!(result, None);
	}

	#[test]
	fn key_press_and_released_after_time_is_debounced() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Released,
			reported_state: KeyState::Released,
			prev_reported_state: KeyState::Released,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(5),
		};
		_ = input_key.update(KeyState::Pressed, Duration::from_millis(0));
		let result = input_key.update(
			KeyState::Released,
			input_key.debounce_time + Duration::from_millis(1),
		);

		assert_eq!(result, None);
	}

	#[test]
	fn key_press_and_released_before_time_is_debounced_after_waiting() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let mut input_key = InputKey {
			id: key_id,
			prev_actual_state: KeyState::Released,
			reported_state: KeyState::Released,
			prev_reported_state: KeyState::Released,
			keydown_time: Duration::from_millis(0),
			debounce_time: Duration::from_millis(5),
		};
		_ = input_key.update(KeyState::Pressed, Duration::from_millis(0));
		let result = input_key.update(
			KeyState::Released,
			input_key.debounce_time + Duration::from_millis(1),
		);

		assert_eq!(result, None);
	}

	struct MockRowPin {}

	impl RowPin for MockRowPin {
		fn set_high(&mut self) {}

		fn set_low(&mut self) {}
	}

	struct MockColPin {
		state: Rc<RefCell<bool>>,
	}

	impl ColPin for MockColPin {
		fn is_high(&self) -> bool {
			*self.state.borrow()
		}
	}

	#[test]
	fn empty_matrix_returns_no_actions() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let row_pin = Box::new(MockRowPin {});
		let state = Rc::new(RefCell::new(false));
		let col_pin = Box::new(MockColPin {
			state: state.clone(),
		});
		let debounce_time = Duration::from_millis(0);

		let mut matrix = KeyMatrix::new([key_id], [row_pin], [col_pin], debounce_time);

		let dt = Duration::from_millis(1);
		let output = &mut Vec::new();

		matrix.update(dt, output);

		assert_eq!(output.len(), 0);
	}

	#[test]
	fn pressed_key_returns_pressed_action() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let row_pin = Box::new(MockRowPin {});
		let state = Rc::new(RefCell::new(true));
		let col_pin = Box::new(MockColPin {
			state: state.clone(),
		});
		let debounce_time = Duration::from_millis(0);

		let mut matrix = KeyMatrix::new([key_id], [row_pin], [col_pin], debounce_time);

		let dt = Duration::from_millis(1);
		let output = &mut Vec::new();
		matrix.update(dt, output);

		assert_eq!(output.len(), 1);
		assert_eq!(output[0].action, KeyState::Pressed);
	}

	#[test]
	fn subsequent_updates_dont_return_pressed_actions() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let row_pin = Box::new(MockRowPin {});
		let state = Rc::new(RefCell::new(true));
		let col_pin = Box::new(MockColPin {
			state: state.clone(),
		});
		let debounce_time = Duration::from_millis(0);

		let mut matrix = KeyMatrix::new([key_id], [row_pin], [col_pin], debounce_time);

		let dt = Duration::from_millis(1);
		let output = &mut Vec::new();

		matrix.update(dt, output);
		output.clear();
		matrix.update(dt, output);

		assert_eq!(
			output.len(),
			0,
			"Subsequent updates should not return any actions, but found actions: {:?}",
			output[0]
		);
	}

	#[test]
	fn subsequent_updates_dont_return_released_actions() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let row_pin = Box::new(MockRowPin {});
		let state = Rc::new(RefCell::new(false));
		let col_pin = Box::new(MockColPin {
			state: state.clone(),
		});
		let debounce_time = Duration::from_millis(0);

		let mut matrix = KeyMatrix::new([key_id], [row_pin], [col_pin], debounce_time);

		let dt = Duration::from_millis(1);
		let output = &mut Vec::new();

		matrix.update(dt, output);
		output.clear();
		matrix.update(dt, output);

		assert_eq!(output.len(), 0);
	}

	#[test]
	fn released_key_returns_released_action() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let row_pin = Box::new(MockRowPin {});
		let state = Rc::new(RefCell::new(true));
		let col_pin = Box::new(MockColPin {
			state: state.clone(),
		});
		let debounce_time = Duration::from_millis(0);

		let mut matrix = KeyMatrix::new([key_id], [row_pin], [col_pin], debounce_time);

		let dt = Duration::from_millis(1);
		let output = &mut Vec::new();

		matrix.update(dt, output);
		output.clear();
		*state.borrow_mut() = false;
		matrix.update(dt, output);

		assert_eq!(output.len(), 1);
		assert_eq!(output[0].action, KeyState::Released);
	}

	#[test]
	fn debounce_released_key() {
		let key_id = KeyId::new(Uuid::from_u128(0));
		let row_pin = Box::new(MockRowPin {});
		let state = Rc::new(RefCell::new(false));
		let col_pin = Box::new(MockColPin {
			state: state.clone(),
		});
		let debounce_time = Duration::from_millis(5);

		let mut matrix = KeyMatrix::new([key_id], [row_pin], [col_pin], debounce_time);

		let dt = Duration::from_millis(1);
		let output = &mut Vec::new();

		matrix.update(dt, output);
		output.clear();
		*state.borrow_mut() = false;
		matrix.update(dt, output);

		assert_eq!(output.len(), 0);
	}
}
