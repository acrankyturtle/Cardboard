extern crate alloc;

use core::fmt;
use core::slice::IterMut;

use crate::input::KeyId;
use crate::profile::*;
use crate::time::Duration;
use alloc::vec::Vec;
use bitset_core::BitSet;
use defmt::warn;
use fugit::ExtU64;

pub struct KeyboardState<'a> {
	keys: Vec<PhysicalKeyState<'a>>,
	virtual_keys: Vec<VirtualKeyState<'a>>,
	tags: TagList<'a>,
	running: Vec<MacroState<'a>>,
	macros: &'a Vec<Macro>,
}

impl<'a> KeyboardState<'a> {
	pub fn from(profile: &'a KeyboardProfile) -> Self {
		let mut state = KeyboardState {
			keys: profile.keys.iter().map(PhysicalKeyState::from).collect(),
			virtual_keys: profile
				.virtual_keys
				.iter()
				.enumerate()
				.map(|(i, vk)| VirtualKeyState::from(vk, i))
				.collect(),
			tags: TagList::new(),
			running: Vec::with_capacity(8),
			macros: &profile.macros,
		};

		state.update_layers();

		state
	}

	pub fn press_key(&mut self, key_id: KeyId) {
		if let Some(key) = self.keys.iter().find(|ks| ks.key.id == key_id) {
			let macros = Self::get_macros_from_key(self.macros, key);
			Self::run_macros(&mut self.running, macros);
		};
	}

	pub fn release_key(&mut self, key_id: KeyId) {
		Self::release_key_source(self.running.iter_mut(), MacroSourceKey::PhysicalKey(key_id));
	}

	fn release_key_source(running: IterMut<MacroState<'a>>, source_key: MacroSourceKey) {
		for macro_ in running {
			if macro_.source.key == source_key
				&& !matches!(macro_.macro_.macro_type, MacroType::Toggle)
			{
				macro_.stop();
			}
		}
	}

	pub fn set_virtual_key_state(&mut self, bits: &[u8]) {
		let num_bits = bits.len() * 8;
		let num_keys = self.virtual_keys.len().min(num_bits);
		for i in 0..num_keys {
			let key = &mut self.virtual_keys[i];
			let Some(bit_index) = to_bitset_index(i, num_bits) else {
				continue;
			};
			let state = bits.bit_test(bit_index);
			match key.update(state) {
				Some(true) => {
					let macros = Self::get_macros_from_key(self.macros, key);
					Self::run_macros(&mut self.running, macros);
				}
				Some(false) => {
					Self::release_key_source(
						self.running.iter_mut(),
						MacroSourceKey::VirtualKey(key.id),
					);
				}
				_ => {}
			};
		}

		// release virtual keys beyond the bitfield
		for i in num_keys..self.virtual_keys.len() {
			let key = &mut self.virtual_keys[i];
			if let Some(false) = key.update(false) {
				Self::release_key_source(
					self.running.iter_mut(),
					MacroSourceKey::VirtualKey(key.id),
				);
			}
		}
	}

	fn get_macros_from_key<'k, K: KeyState<'a>>(
		macros: &'a Vec<Macro>,
		key: &'k K,
	) -> impl Iterator<Item = MacroState<'a>> + use<'a, 'k, K> {
		key.current_layer()
			.macros
			.iter()
			.filter_map(|i| match macros.get(i.get_index()) {
				Some(macro_) => Some(MacroState::from(macro_, key)),
				None => {
					warn!("Macro index {:?} not found in profile macros.", i);
					None
				}
			})
	}

	fn run_macros(running: &mut Vec<MacroState<'a>>, macros: impl Iterator<Item = MacroState<'a>>) {
		let start_index = running.len();

		for m in macros {
			if matches!(m.macro_.macro_type, MacroType::Toggle) {
				// for toggle macros, stop it instead of starting a new one if already running
				let already_running = running[..start_index].iter_mut().find(|r| {
					r.macro_.id == m.macro_.id
						&& r.source.key == m.source.key
						&& matches!(r.trigger, TriggerState::Running)
				});
				if let Some(existing) = already_running {
					existing.stop();
					continue;
				}
			}
			running.push(m);
		}

		// cut existing macros by the cut channels of the new macros
		let (existing, new) = running.split_at_mut(start_index);
		Self::cut_channels(existing, new);
	}

	pub fn tick(&mut self, elapsed: Duration, mut on_event: impl FnMut(&'a ActionEvent)) {
		for macro_ in self.running.iter_mut() {
			macro_.tick(elapsed, &mut on_event);
		}

		self.running.retain(|macro_| !macro_.is_finished());
	}

	pub fn add_internal_tag(&mut self, tag: &'a LayerTag) {
		self.tags.add_internal(tag);
		self.update_layers();
	}

	pub fn remove_internal_tag(&mut self, tag: &'a LayerTag) {
		self.tags.remove_internal(tag);
		self.update_layers();
	}

	pub fn get_external_tags(&self) -> &[LayerTag] {
		&self.tags.external
	}

	pub fn to_external_tags(self) -> Vec<LayerTag> {
		self.tags.external
	}

	pub fn set_external_tags(&mut self, tags: Vec<LayerTag>) {
		self.tags.set_external(tags);
		self.update_layers();
	}

	fn update_layers(&mut self) {
		for ks in self
			.keys
			.iter_mut()
			.map(|pk| pk as &mut dyn KeyState)
			.chain(
				self.virtual_keys
					.iter_mut()
					.map(|vk| vk as &mut dyn KeyState),
			) {
			let new_layer = ks.update_current_layer(&self.tags);

			if let Some(new_layer) = new_layer {
				// release macros that no longer have a valid source
				for macro_ in self
					.running
					.iter_mut()
					.filter(|m| m.source.key == ks.key() && m.source.layer != new_layer.id)
				{
					macro_.stop();
				}
			}
		}
	}

	fn cut_channels(running: &mut [MacroState<'a>], new_macros: &[MacroState<'a>]) {
		for macro_ in running.iter_mut() {
			if let Some(channel) = macro_.macro_.play_channel {
				if new_macros
					.iter()
					.any(|m| m.macro_.cut_channels.contains(&channel))
				{
					macro_.stop();
				}
			}
		}
	}
}

struct PhysicalKeyState<'a> {
	key: &'a DeviceKey,
	current_layer: &'a DeviceKeyLayer,
}

impl<'a> PhysicalKeyState<'a> {
	pub fn from(key: &'a DeviceKey) -> Self {
		Self {
			key,
			current_layer: &key.layers.default_layer,
		}
	}
}

struct VirtualKeyState<'a> {
	state: bool,
	id: usize,
	key: &'a VirtualKey,
	current_layer: &'a DeviceKeyLayer,
}

impl<'a> VirtualKeyState<'a> {
	pub fn from(key: &'a VirtualKey, id: usize) -> Self {
		Self {
			state: false,
			id,
			key,
			current_layer: &key.layers.default_layer,
		}
	}

	fn update(&mut self, state: bool) -> Option<bool> {
		if self.state != state {
			self.state = state;
			return Some(state);
		}
		None
	}
}

trait KeyState<'a> {
	fn key(&self) -> MacroSourceKey;
	#[allow(dead_code)]
	fn layers(&self) -> &'a DeviceLayers;
	fn current_layer(&self) -> &'a DeviceKeyLayer;
	fn update_current_layer(&mut self, tags: &TagList) -> Option<&'a DeviceKeyLayer>;
}

impl<'a> KeyState<'a> for PhysicalKeyState<'a> {
	fn key(&self) -> MacroSourceKey {
		MacroSourceKey::PhysicalKey(self.key.id)
	}

	fn layers(&self) -> &'a DeviceLayers {
		&self.key.layers
	}

	fn current_layer(&self) -> &'a DeviceKeyLayer {
		self.current_layer
	}

	fn update_current_layer(&mut self, tags: &TagList) -> Option<&'a DeviceKeyLayer> {
		let new_layer = self.key.layers.get_active_layer(tags);

		if new_layer.id != self.current_layer.id {
			self.current_layer = new_layer;
			Some(new_layer)
		} else {
			None
		}
	}
}

impl<'a> KeyState<'a> for VirtualKeyState<'a> {
	fn key(&self) -> MacroSourceKey {
		MacroSourceKey::VirtualKey(self.id)
	}

	fn layers(&self) -> &'a DeviceLayers {
		&self.key.layers
	}

	fn current_layer(&self) -> &'a DeviceKeyLayer {
		self.current_layer
	}

	fn update_current_layer(&mut self, tags: &TagList) -> Option<&'a DeviceKeyLayer> {
		let new_layer = self.key.layers.get_active_layer(tags);

		if new_layer.id != self.current_layer.id {
			self.current_layer = new_layer;
			Some(new_layer)
		} else {
			None
		}
	}
}

struct MacroState<'a> {
	macro_: &'a Macro,
	current_sequence: CurrentSequence<'a>,
	trigger: TriggerState,
	source: MacroSource,
}

impl<'a> MacroState<'a> {
	pub fn from<K: KeyState<'a>>(macro_: &'a Macro, source: &K) -> Self {
		MacroState {
			macro_,
			current_sequence: CurrentSequence::Start(SequenceState::from(
				&macro_.start_sequence,
				0.millis(),
			)),
			trigger: TriggerState::Running,
			source: MacroSource {
				key: source.key(),
				layer: source.current_layer().id,
			},
		}
	}

	pub fn tick(
		&mut self,
		mut elapsed: Duration,
		on_event: &mut impl FnMut(&'a ActionEvent),
	) -> Duration {
		while !self.is_finished() && !elapsed.is_zero() {
			if let CurrentSequence::Start(ref mut seq)
			| CurrentSequence::Loop(ref mut seq)
			| CurrentSequence::End(ref mut seq) = self.current_sequence
			{
				elapsed = seq.tick(elapsed, on_event);

				if seq.is_finished() {
					self.move_to_next_seq(elapsed);

					if let CurrentSequence::Loop(seq) = &self.current_sequence {
						if seq.is_finished() {
							break;
						}
					}
				}
			}
		}

		elapsed
	}

	pub fn is_finished(&self) -> bool {
		matches!(self.current_sequence, CurrentSequence::Finished)
	}

	fn stop(&mut self) {
		self.trigger = TriggerState::Stopping;
	}

	fn move_to_next_seq(&mut self, elapsed: Duration) {
		match self.current_sequence {
			CurrentSequence::Start(_) => match self.trigger {
				TriggerState::Running => self.move_to_loop(elapsed),
				TriggerState::Stopping => self.move_to_end(elapsed),
			},
			CurrentSequence::Loop(_) => match self.trigger {
				TriggerState::Running => self.move_to_loop(elapsed),
				TriggerState::Stopping => self.move_to_end(elapsed),
			},
			CurrentSequence::End(_) => {
				self.current_sequence = CurrentSequence::Finished;
			}
			CurrentSequence::Finished => {}
		}
	}

	fn move_to_loop(&mut self, elapsed: Duration) {
		self.current_sequence =
			CurrentSequence::Loop(SequenceState::from(&self.macro_.loop_sequence, elapsed));
	}

	fn move_to_end(&mut self, elapsed: Duration) {
		self.current_sequence =
			CurrentSequence::End(SequenceState::from(&self.macro_.end_sequence, elapsed));
	}
}

struct MacroSource {
	key: MacroSourceKey,
	layer: LayerId,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MacroSourceKey {
	PhysicalKey(KeyId),
	VirtualKey(usize),
}

struct SequenceState<'a> {
	pending: Vec<&'a Action>,
	elapsed: Duration,
}

impl<'a> SequenceState<'a> {
	fn from(sequence: &'a Sequence, elapsed: Duration) -> Self {
		SequenceState {
			pending: sequence.actions.iter().rev().collect(),
			elapsed,
		}
	}

	pub fn tick(
		&mut self,
		elapsed: Duration,
		on_event: &mut impl FnMut(&'a ActionEvent),
	) -> Duration {
		self.elapsed += elapsed;

		while let Some(action) = self.pending.pop() {
			if (action.predelay_ms as u64) <= self.elapsed.to_millis() {
				on_event(&action.action_event);
				self.elapsed -= (action.predelay_ms as u64).millis();
			} else {
				self.pending.push(action);
				return 0.millis();
			}
		}

		self.elapsed
	}

	pub fn is_finished(&self) -> bool {
		self.pending.is_empty()
	}
}

enum CurrentSequence<'a> {
	Start(SequenceState<'a>),
	Loop(SequenceState<'a>),
	End(SequenceState<'a>),
	Finished,
}

impl<'a> fmt::Debug for CurrentSequence<'a> {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match *self {
			CurrentSequence::Start(_) => write!(f, "Start"),
			CurrentSequence::Loop(_) => write!(f, "Loop"),
			CurrentSequence::End(_) => write!(f, "End"),
			CurrentSequence::Finished => write!(f, "Finished"),
		}
	}
}

#[derive(Debug)]
enum TriggerState {
	Running,
	Stopping,
}

pub struct TagList<'a> {
	pub(crate) internal: Vec<&'a LayerTag>,
	pub(crate) external: Vec<LayerTag>,
}

impl<'a> TagList<'a> {
	pub fn new() -> Self {
		TagList {
			internal: Vec::new(),
			external: Vec::new(),
		}
	}

	pub fn add_internal(&mut self, tag: &'a LayerTag) {
		self.internal.push(tag);
	}

	pub fn remove_internal(&mut self, tag: &'a LayerTag) {
		if let Some(index) = self.internal.iter().position(|t| *t == tag) {
			self.internal.remove(index);
		}
	}

	pub fn clear_internal(&mut self) {
		self.internal.clear();
	}

	pub fn set_external(&mut self, tags: Vec<LayerTag>) {
		self.external = tags;
	}

	pub fn matches(&self, tags: &[LayerTag], match_type: &TagMatchType) -> bool {
		match match_type {
			TagMatchType::All => tags.iter().all(|t| self.contains(t)),
			TagMatchType::Any => tags.iter().any(|t| self.contains(t)),
		}
	}

	fn contains(&self, value: &LayerTag) -> bool {
		self.internal
			.iter()
			.copied()
			.chain(self.external.iter())
			.any(|tag| *tag == *value)
	}
}

// bit 0 in bitset_core = xxxxxxx1...(other bytes), whereas vk 0 is 1xxxxxxx...(other bytes)
pub(crate) fn to_bitset_index(vk_index: usize, total_bits: usize) -> Option<usize> {
	if vk_index >= total_bits {
		return None;
	}
	let byte = vk_index / 8;
	let bit = 7 - (vk_index % 8);
	Some(byte * 8 + bit)
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::time::Duration;
	use alloc::string::ToString;
	use alloc::vec;
	use fugit::ExtU64;
	use uuid::Uuid;

	static KEY_ID: KeyId = KeyId::new(Uuid::from_u128_le(0xd1472104_1c37_560f_a39b_1737983559fc));
	static KEY_ID2: KeyId = KeyId::new(Uuid::from_u128_le(0x5661275b_eba1_5c7b_b7cc_f8f8dd08d3b7));
	static MACRO_ID: MacroId =
		MacroId::new(Uuid::from_u128_le(0x140acba7_4971_5b36_af21_ce478b891606));
	static MACRO_ID2: MacroId =
		MacroId::new(Uuid::from_u128_le(0x1326a82d_af4c_5e64_8619_ed6686415550));
	static CHANNEL_ID: Channel = Channel::new(3);
	static CHANNEL_ID2: Channel = Channel::new(4);
	static LAYER_ID: LayerId =
		LayerId::new(Uuid::from_u128_le(0x6e30c4c9_8e84_5e71_a303_6fc00ca31d68));
	static LAYER_ID2: LayerId =
		LayerId::new(Uuid::from_u128_le(0x2cb2145a_6fd1_59e3_8b2e_bd8160f9924c));

	// ------- SEQUENCE TESTS --------

	#[test]
	fn sequence_accumulates_elapsed_time() {
		let sequence = Sequence {
			actions: vec![Action {
				predelay_ms: 1000,
				action_event: ActionEvent::None,
			}],
		};

		let mut state = SequenceState::from(&sequence, 0.millis());
		assert_eq!(state.elapsed, 0.millis() as Duration);

		state.tick(50.millis() as Duration, &mut |_| {});
		assert_eq!(state.elapsed, 50.millis() as Duration);

		state.tick(100.millis() as Duration, &mut |_| {});
		assert_eq!(state.elapsed, 150.millis() as Duration);

		state.tick(200.millis() as Duration, &mut |_| {});
		assert_eq!(state.elapsed, 350.millis() as Duration);
	}

	#[test]
	fn sequence_doesnt_pop_actions_while_accumulating() {
		let sequence = Sequence {
			actions: vec![Action {
				predelay_ms: 1000,
				action_event: ActionEvent::None,
			}],
		};

		let mut state = SequenceState::from(&sequence, 0.millis());
		assert_eq!(state.pending.len(), 1);

		state.tick(100.millis(), &mut |_| {});
		assert_eq!(state.pending.len(), 1);

		state.tick(100.millis(), &mut |_| {});
		assert_eq!(state.pending.len(), 1);

		state.tick(200.millis(), &mut |_| {});
		assert_eq!(state.pending.len(), 1);

		state.tick(599.millis(), &mut |_| {});
		assert_eq!(state.pending.len(), 1);
	}

	#[test]
	fn sequence_moves_to_next_action() {
		let sequence = Sequence {
			actions: vec![
				Action {
					predelay_ms: 100,
					action_event: ActionEvent::None,
				},
				Action {
					predelay_ms: 200,
					action_event: ActionEvent::None,
				},
			],
		};

		let mut state = SequenceState::from(&sequence, 0.millis());
		assert_eq!(state.pending.len(), 2);

		state.tick(99.millis(), &mut |_| {});
		assert_eq!(state.pending.len(), 2);

		state.tick(1.millis(), &mut |_| {});
		assert_eq!(state.pending.len(), 1);
	}

	#[test]
	fn sequence_finishes() {
		let sequence = Sequence {
			actions: vec![
				Action {
					predelay_ms: 100,
					action_event: ActionEvent::None,
				},
				Action {
					predelay_ms: 200,
					action_event: ActionEvent::None,
				},
			],
		};

		let mut state = SequenceState::from(&sequence, 0.millis());
		assert_eq!(state.is_finished(), false);

		state.tick(299.millis(), &mut |_| {});
		assert_eq!(state.is_finished(), false);

		state.tick(1.millis(), &mut |_| {});
		assert_eq!(state.is_finished(), true);
	}

	#[test]
	fn sequence_pops_no_delay_action_immediately() {
		let sequence = Sequence {
			actions: vec![Action {
				predelay_ms: 0,
				action_event: ActionEvent::None,
			}],
		};

		let mut state = SequenceState::from(&sequence, 0.millis());
		assert_eq!(state.pending.len(), 1);

		state.tick(0.millis(), &mut |_| {});
		assert_eq!(state.pending.len(), 0);
	}

	#[test]
	fn sequence_pops_multiple_actions_with_long_elapsed_time() {
		let sequence = Sequence {
			actions: vec![
				Action {
					predelay_ms: 100,
					action_event: ActionEvent::None,
				},
				Action {
					predelay_ms: 200,
					action_event: ActionEvent::None,
				},
				Action {
					predelay_ms: 100,
					action_event: ActionEvent::None,
				},
			],
		};

		let mut state = SequenceState::from(&sequence, 0.millis());
		assert_eq!(state.pending.len(), 3);

		state.tick(400.millis(), &mut |_| {});
		assert_eq!(state.pending.len(), 0);
	}

	#[test]
	fn sequence_gets_correct_actions() {
		let sequence = Sequence {
			actions: vec![
				Action {
					predelay_ms: 100,
					action_event: ActionEvent::Keyboard(KeyboardEvent::KeyDown(KeyboardKey::A)),
				},
				Action {
					predelay_ms: 200,
					action_event: ActionEvent::Mouse(MouseEvent::Move(MouseMove { x: 0, y: 0 })),
				},
				Action {
					predelay_ms: 100,
					action_event: ActionEvent::Keyboard(KeyboardEvent::KeyUp(KeyboardKey::A)),
				},
			],
		};

		let mut state = SequenceState::from(&sequence, 0.millis());
		let mut events = vec![];

		state.tick(400.millis(), &mut |e| events.push(e));
		assert_eq!(events.len(), 3);

		assert!(matches!(
			events[0],
			ActionEvent::Keyboard(KeyboardEvent::KeyDown(KeyboardKey::A))
		));
		assert!(matches!(
			events[1],
			ActionEvent::Mouse(MouseEvent::Move(MouseMove { x: 0, y: 0 }))
		));
		assert!(matches!(
			events[2],
			ActionEvent::Keyboard(KeyboardEvent::KeyUp(KeyboardKey::A))
		));
	}

	// ------- MACRO TESTS --------
	#[test]
	fn macro_moves_to_loop_sequence() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![MacroIndex::new(0)]);

		let key_state = PhysicalKeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Start(_)
		));

		macro_state.tick(100.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn macro_loops() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![MacroIndex::new(0)]);

		let key_state = PhysicalKeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.tick(100.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.tick(200.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn macro_with_empty_loop_still_loops() {
		let _macro = Macro {
			start_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 100,
					action_event: ActionEvent::None,
				}],
			},
			loop_sequence: Sequence { actions: vec![] },
			end_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 300,
					action_event: ActionEvent::None,
				}],
			},
			cut_channels: vec![CHANNEL_ID],
			macro_type: MacroType::Momentary,
			id: MACRO_ID,
			name: "Name".to_string(),
			play_channel: Some(CHANNEL_ID),
		};
		let device_key = new_test_device_key(KEY_ID, vec![MacroIndex::new(0)]);

		let key_state = PhysicalKeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.tick(100.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.tick(300.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn macro_goes_to_end() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![MacroIndex::new(0)]);

		let key_state = PhysicalKeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.tick(100.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.stop();

		macro_state.tick(200.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn macro_ends() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![MacroIndex::new(0)]);

		let key_state = PhysicalKeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.tick(100.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.stop();

		macro_state.tick(200.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));

		macro_state.tick(300.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Finished
		));
	}

	#[test]
	fn macro_skips_to_end_when_released_during_start() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![MacroIndex::new(0)]);

		let key_state = PhysicalKeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.stop();

		macro_state.tick(100.millis(), &mut |_| {});
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));
	}

	// ------- KEYBOARD STATE TESTS --------

	#[test]
	fn pressing_a_key_starts_a_macro() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		assert_eq!(state.running.len(), 0);
		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);
	}

	#[test]
	fn keyboard_tick_updates_macros() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Start(_)
		));

		state.tick(100.millis(), |_| {});
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));

		state.tick(200.millis(), |_| {});
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn releasing_a_key_stops_a_macro() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		state.release_key(KEY_ID);

		state.tick(100.millis(), |_| {});
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn pressing_a_key_cuts_own_channel() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 2);

		state.tick(100.millis(), |_| {});

		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn pressing_a_key_cuts_other_channel() {
		let key_1 = KEY_ID;
		let key_2 = KEY_ID2;

		let macro_0 = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![]);
		let macro_1 = new_test_macro(MACRO_ID, Some(CHANNEL_ID2), vec![CHANNEL_ID]);

		let profile = new_test_profile(
			vec![
				new_test_device_key(key_1, vec![MacroIndex::new(0)]),
				new_test_device_key(key_2, vec![MacroIndex::new(1)]),
			],
			vec![macro_0, macro_1],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(key_1);
		assert_eq!(state.running.len(), 1);

		state.press_key(key_2);
		assert_eq!(state.running.len(), 2);

		state.tick(100.millis(), |_| {});

		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
		assert!(matches!(
			state.running[1].current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	// #[test]
	// fn updating_profile_releases_macros() {
	// 	let profile = new_test_profile(vec![new_test_device_key(
	// 		KEY_ID,
	// 		vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
	// 	)]);
	// 	let mut state = KeyboardState::from(&profile);
	//
	// 	state.press_key(KEY_ID);
	//
	// 	let new_profile = new_test_profile(vec![new_test_device_key(
	// 		KEY_ID,
	// 		vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
	// 	)]);
	// 	state.update_key_profile(&new_profile);
	//
	// 	state.tick(100.millis(), &mut vec![]);
	// 	assert!(matches!(
	// 		state.running[0].current_sequence,
	// 		CurrentSequence::End(_)
	// 	));
	// }

	#[test]
	fn internal_tags_affect_macro_selection() {
		let expected_macro_id = MACRO_ID2;
		let other_macro_id = MACRO_ID;

		let expected_macro = new_test_macro(expected_macro_id, Some(CHANNEL_ID), vec![CHANNEL_ID]);

		let other_macro = new_test_macro(other_macro_id, Some(CHANNEL_ID), vec![CHANNEL_ID]);

		let macros = vec![expected_macro, other_macro];

		let tag = LayerTag::new("".to_string());
		let device_key = DeviceKey {
			id: KEY_ID,
			layers: DeviceLayers {
				layers: vec![TaggedDeviceKeyLayer {
					layer: DeviceKeyLayer {
						id: LAYER_ID2,
						macros: vec![MacroIndex::new(0)],
					},
					tags: vec![tag.clone()],
					match_type: TagMatchType::All,
				}],
				default_layer: DeviceKeyLayer {
					id: LAYER_ID,
					macros: vec![MacroIndex::new(1)],
				},
			},
		};

		let profile = new_test_profile(vec![device_key], macros);
		let mut state = KeyboardState::from(&profile);

		state.add_internal_tag(&tag);

		state.press_key(KEY_ID);

		assert_eq!(state.running[0].macro_.id, expected_macro_id);
	}

	#[test]
	fn external_tags_affect_macro_selection() {
		let expected_macro_id = MACRO_ID2;
		let other_macro_id = MACRO_ID;

		let expected_macro = new_test_macro(expected_macro_id, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let other_macro = new_test_macro(other_macro_id, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let macros = vec![expected_macro, other_macro];

		let tag = LayerTag::new("".to_string());
		let device_key = DeviceKey {
			id: KEY_ID,
			layers: DeviceLayers {
				layers: vec![TaggedDeviceKeyLayer {
					layer: DeviceKeyLayer {
						id: LAYER_ID2,
						macros: vec![MacroIndex::new(0)],
					},
					tags: vec![tag.clone()],
					match_type: TagMatchType::All,
				}],
				default_layer: DeviceKeyLayer {
					id: LAYER_ID,
					macros: vec![MacroIndex::new(1)],
				},
			},
		};

		let profile = new_test_profile(vec![device_key], macros);
		let mut state = KeyboardState::from(&profile);

		state.set_external_tags(vec![tag.clone()]);

		state.press_key(KEY_ID);

		assert_eq!(state.running[0].macro_.id, expected_macro_id);
	}

	#[test]
	fn internal_tags_dont_affect_macro_selection_when_not_set() {
		let expected_macro_id = MACRO_ID;
		let other_macro_id = MACRO_ID2;

		let expected_macro = new_test_macro(expected_macro_id, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let other_macro = new_test_macro(other_macro_id, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let macros = vec![expected_macro, other_macro];

		let tag = LayerTag::new("".to_string());
		let device_key = DeviceKey {
			id: KEY_ID,
			layers: DeviceLayers {
				layers: vec![TaggedDeviceKeyLayer {
					layer: DeviceKeyLayer {
						id: LAYER_ID2,
						macros: vec![MacroIndex::new(1)],
					},
					tags: vec![tag],
					match_type: TagMatchType::All,
				}],
				default_layer: DeviceKeyLayer {
					id: LAYER_ID,
					macros: vec![MacroIndex::new(0)],
				},
			},
		};

		let profile = new_test_profile(vec![device_key], macros);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);

		assert_eq!(state.running[0].macro_.id, expected_macro_id);
	}

	#[test]
	fn layers_with_empty_tags_never_match_for_any() {
		let tag = LayerTag::new("".to_string());
		let tag_list = TagList {
			internal: vec![],
			external: vec![],
		};

		assert_eq!(tag_list.matches(&[tag], &TagMatchType::Any), false);
	}

	#[test]
	fn layers_with_empty_tags_never_match_for_all() {
		let tag = LayerTag::new("".to_string());
		let tag_list = TagList {
			internal: vec![],
			external: vec![],
		};

		assert_eq!(tag_list.matches(&[tag], &TagMatchType::All), false);
	}

	#[test]
	fn internal_tag_is_still_set_when_setting_tag_twice_and_clearing_once() {
		let tag1 = LayerTag::new("tag1".to_string());

		let mut tag_list = TagList::new();

		tag_list.add_internal(&tag1);
		tag_list.add_internal(&tag1);

		tag_list.remove_internal(&tag1);

		assert_eq!(tag_list.matches(&[tag1.clone()], &TagMatchType::All), true);
	}

	// ------- HELPERS --------

	fn new_test_profile(keys: Vec<DeviceKey>, macros: Vec<Macro>) -> KeyboardProfile {
		KeyboardProfile {
			name: "".to_string(),
			keys,
			virtual_keys: vec![],
			macros,
		}
	}

	fn new_test_device_key(id: KeyId, macros: Vec<MacroIndex>) -> DeviceKey {
		DeviceKey {
			id,
			layers: DeviceLayers {
				layers: Vec::new(),
				default_layer: DeviceKeyLayer {
					id: LAYER_ID,
					macros,
				},
			},
		}
	}

	fn new_test_macro(id: MacroId, channel: Option<Channel>, cut: Vec<Channel>) -> Macro {
		Macro {
			start_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 100,
					action_event: ActionEvent::None,
				}],
			},
			loop_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 200,
					action_event: ActionEvent::None,
				}],
			},
			end_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 300,
					action_event: ActionEvent::None,
				}],
			},
			cut_channels: cut,
			macro_type: MacroType::Momentary,
			id,
			name: "Name".to_string(),
			play_channel: channel,
		}
	}

	fn new_test_toggle_macro(id: MacroId, channel: Option<Channel>, cut: Vec<Channel>) -> Macro {
		Macro {
			start_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 100,
					action_event: ActionEvent::None,
				}],
			},
			loop_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 200,
					action_event: ActionEvent::None,
				}],
			},
			end_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 300,
					action_event: ActionEvent::None,
				}],
			},
			cut_channels: cut,
			macro_type: MacroType::Toggle,
			id,
			name: "Name".to_string(),
			play_channel: channel,
		}
	}

	fn new_test_layer_macro(id: MacroId, tag: LayerTag) -> Macro {
		let set_tag = tag.clone();
		let clear_tag = tag;
		Macro {
			start_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 0,
					action_event: ActionEvent::Layer(LayerEvent::Set(set_tag)),
				}],
			},
			loop_sequence: Sequence { actions: vec![] },
			end_sequence: Sequence {
				actions: vec![Action {
					predelay_ms: 0,
					action_event: ActionEvent::Layer(LayerEvent::Clear(clear_tag)),
				}],
			},
			cut_channels: vec![],
			macro_type: MacroType::Momentary,
			id,
			name: "Layer".to_string(),
			play_channel: None,
		}
	}

	// ------- TOGGLE MACRO TESTS --------

	#[test]
	fn toggle_macro_stays_running_after_release() {
		let _macro = new_test_toggle_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		state.tick(100.millis(), |_| {});
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));

		state.release_key(KEY_ID);
		state.tick(200.millis(), |_| {});
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn toggle_macro_stops_on_second_press() {
		let _macro = new_test_toggle_macro(MACRO_ID, Some(CHANNEL_ID), vec![]);
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		state.tick(100.millis(), |_| {});
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));

		// Second press should stop the macro, not start a new one
		state.release_key(KEY_ID);
		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);

		state.tick(200.millis(), |_| {});
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn toggle_macro_completes_end_sequence() {
		let _macro = new_test_toggle_macro(MACRO_ID, Some(CHANNEL_ID), vec![]);
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		state.tick(100.millis(), |_| {});

		// Second press triggers end
		state.release_key(KEY_ID);
		state.press_key(KEY_ID);
		state.tick(200.millis(), |_| {});
		assert_eq!(state.running.len(), 1);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));

		// End sequence completes and macro is cleaned up
		state.tick(300.millis(), |_| {});
		assert_eq!(state.running.len(), 0);
	}

	// ------- LAYER EVENT EMISSION TESTS --------

	#[test]
	fn macro_emits_layer_set_on_start() {
		let set_tag = LayerTag::new("layer1".to_string());
		let _macro = new_test_layer_macro(MACRO_ID, set_tag.clone());
		let device_key = new_test_device_key(KEY_ID, vec![MacroIndex::new(0)]);

		let key_state = PhysicalKeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		let mut events = vec![];
		macro_state.tick(100.millis(), &mut |e| events.push(e));

		assert_eq!(events.len(), 1);
		match events[0] {
			ActionEvent::Layer(LayerEvent::Set(tag)) => assert_eq!(*tag, set_tag),
			_ => panic!("expected Set layer event, got {:?}", events[0]),
		}
	}

	#[test]
	fn macro_emits_layer_clear_on_end() {
		let tag = LayerTag::new("layer1".to_string());
		let _macro = new_test_layer_macro(MACRO_ID, tag.clone());
		let device_key = new_test_device_key(KEY_ID, vec![MacroIndex::new(0)]);

		let key_state = PhysicalKeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		// run the start sequence (emits Set), leaving the macro looping
		macro_state.tick(100.millis(), &mut |_| {});
		macro_state.stop();

		let mut events = vec![];
		macro_state.tick(100.millis(), &mut |e| events.push(e));

		assert_eq!(events.len(), 1);
		match events[0] {
			ActionEvent::Layer(LayerEvent::Clear(t)) => assert_eq!(*t, tag),
			_ => panic!("expected Clear layer event, got {:?}", events[0]),
		}
	}

	#[test]
	fn pressing_a_key_emits_layer_set() {
		let set_tag = LayerTag::new("layer1".to_string());
		let _macro = new_test_layer_macro(MACRO_ID, set_tag.clone());
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);

		let mut events = vec![];
		state.tick(100.millis(), |e| events.push(e));

		assert_eq!(events.len(), 1);
		match events[0] {
			ActionEvent::Layer(LayerEvent::Set(tag)) => assert_eq!(*tag, set_tag),
			_ => panic!("expected Set layer event, got {:?}", events[0]),
		}
	}

	#[test]
	fn releasing_a_key_emits_layer_clear() {
		let tag = LayerTag::new("layer1".to_string());
		let _macro = new_test_layer_macro(MACRO_ID, tag.clone());
		let profile = new_test_profile(
			vec![new_test_device_key(KEY_ID, vec![MacroIndex::new(0)])],
			vec![_macro],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		state.tick(100.millis(), |_| {}); // run the start sequence (emits Set)

		state.release_key(KEY_ID);

		let mut events = vec![];
		state.tick(100.millis(), |e| events.push(e));

		assert_eq!(events.len(), 1);
		match events[0] {
			ActionEvent::Layer(LayerEvent::Clear(t)) => assert_eq!(*t, tag),
			_ => panic!("expected Clear layer event, got {:?}", events[0]),
		}
	}
}
