use alloc::string::ToString;
use defmt::Format;
use embassy_rp::gpio::{Input, Output};
use embassy_sync::blocking_mutex::raw::NoopRawMutex;
use embassy_time::{Duration, Instant, Timer};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[macro_export]
macro_rules! matrix_task {
	($name:ident, $rows:expr, $cols:expr, $tick_rate:literal) => {
		#[embassy_executor::task]
		async fn $name(
			mut matrix: KeyMatrix<'static, $rows, $cols, { $rows * $cols }>,
			sender: embassy_sync::channel::Sender<
				'static,
				NoopRawMutex,
				$crate::input::MatrixEventMessage<{ $rows * $cols }>,
				3,
			>,
		) {
			const KEY_COUNT: usize = $rows * $cols;
			$crate::input::input_task(matrix, sender, 100).await;
		}
	};
}

pub async fn input_task<'a, const ROWS: usize, const COLS: usize, const KEY_COUNT: usize>(
	mut matrix: KeyMatrix<'a, ROWS, COLS, KEY_COUNT>,
	sender: embassy_sync::channel::Sender<'a, NoopRawMutex, MatrixEventMessage<KEY_COUNT>, 3>,
	tick_rate: u32,
) {
	let tick_duration_ms = 1000.0 / tick_rate as f32;
	let tick_duration = Duration::from_millis(tick_duration_ms as u64);

	loop {
		let now = Instant::now();
		let (actions, count) = matrix.update(now);

		sender
			.send(MatrixEventMessage::new(actions, count).unwrap())
			.await;

		Timer::at(now + tick_duration).await;
	}
}

pub struct MatrixEventMessage<const KEY_COUNT: usize> {
	actions: [KeyboardAction; KEY_COUNT],
	count: usize,
}

impl<const KEY_COUNT: usize> MatrixEventMessage<KEY_COUNT> {
	pub fn new(actions: [KeyboardAction; KEY_COUNT], count: usize) -> Option<Self> {
		if count <= KEY_COUNT {
			Some(Self { count, actions })
		} else {
			None
		}
	}

	pub fn actions(&self) -> &[KeyboardAction] {
		&self.actions[..self.count]
	}
}

pub struct KeyMatrix<'a, const ROWS: usize, const COLS: usize, const KEY_COUNT: usize> {
	rows: [Output<'a>; ROWS],
	cols: [Input<'a>; COLS],
	keys: [InputKey; KEY_COUNT],
}

impl<'a, const ROWS: usize, const COLS: usize, const KEY_COUNT: usize>
	KeyMatrix<'a, ROWS, COLS, KEY_COUNT>
{
	pub fn new(
		key_ids: [KeyId; KEY_COUNT],
		rows: [Output<'a>; ROWS],
		cols: [Input<'a>; COLS],
		debounce_time: Duration,
	) -> Self {
		assert_eq!(key_ids.len(), ROWS * COLS);
		Self {
			rows,
			cols,
			keys: Self::from_key_ids(key_ids, debounce_time),
		}
	}

	fn from_key_ids<const N: usize>(key_ids: [KeyId; N], debounce_time: Duration) -> [InputKey; N] {
		let mut keys = [InputKey {
			id: KeyId(Uuid::nil()),
			state: KeyState::Released,
			report: KeyState::Released,
			prev_report: KeyState::Released,
			keydown_timestamp: Instant::from_ticks(0),
			debounce_time,
		}; N];

		for (k, id) in keys.iter_mut().zip(key_ids) {
			*k = InputKey {
				id,
				state: KeyState::Released,
				report: KeyState::Released,
				prev_report: KeyState::Released,
				keydown_timestamp: Instant::from_ticks(0),
				debounce_time,
			};
		}

		keys
	}

	pub fn update(&mut self, time: Instant) -> ([KeyboardAction; KEY_COUNT], usize) {
		self.scan(time);

		for k in self.keys.iter_mut() {
			k.debounce_tick(time);
		}

		self.get_actions()
	}

	fn scan(&mut self, time: Instant) {
		for (r, row_pin) in self.rows.iter_mut().enumerate() {
			row_pin.set_high();

			for (c, col_pin) in self.cols.iter_mut().enumerate() {
				let i = r * ROWS + c;
				if col_pin.is_high() {
					self.keys[i].down(time)
				} else {
					self.keys[i].up()
				}
			}

			row_pin.set_low();
		}
	}

	fn get_actions(&self) -> ([KeyboardAction; KEY_COUNT], usize) {
		let mut actions = [KeyboardAction::default(); KEY_COUNT];

		let i = 0;

		for k in self.keys.iter() {
			if k.report != k.prev_report {
				actions[i] = KeyboardAction {
					action: k.report,
					key_id: k.id,
				};
			}
		}

		(actions, i)
	}
}

#[derive(Clone, Copy)]
pub struct InputKey {
	id: KeyId,
	state: KeyState,
	report: KeyState,
	prev_report: KeyState,
	keydown_timestamp: Instant,
	debounce_time: Duration,
}

impl InputKey {
	pub fn id(&self) -> KeyId {
		self.id
	}

	pub fn state(&self) -> (KeyState, KeyState) {
		(self.prev_report, self.state)
	}

	fn down(&mut self, time: Instant) {
		if self.state == KeyState::Pressed {
			return;
		}
		self.keydown_timestamp = time;
		self.state = KeyState::Pressed;
	}

	fn up(&mut self) {
		self.state = KeyState::Released;
	}

	/// Latches all key presses for at least `debounce_time`
	fn debounce_tick(&mut self, time: Instant) {
		self.prev_report = self.report;
		self.report = match (self.report, self.state) {
			(KeyState::Pressed, KeyState::Released) => {
				if time.duration_since(self.keydown_timestamp) < self.debounce_time {
					// debouncing
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

#[derive(Clone, Copy)]
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

#[derive(Clone, Copy, PartialEq, Format)]
pub enum KeyState {
	Pressed,
	Released,
}
