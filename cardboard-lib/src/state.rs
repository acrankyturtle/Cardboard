extern crate alloc;

use core::fmt;

use crate::input::KeyId;
use crate::profile::*;
use crate::time::Duration;
use alloc::vec::Vec;
use fugit::ExtU64;

pub struct KeyboardState<'a> {
	keys: Vec<KeyState<'a>>,
	tags: TagList,
	running: Vec<MacroState<'a>>,
	macros: &'a Vec<Macro>,
}

impl<'a> KeyboardState<'a> {
	pub fn from(profile: &'a KeyboardProfile) -> Self {
		let mut state = KeyboardState {
			keys: KeyboardState::map_keys_from_profile(profile),
			tags: TagList::new(),
			running: Vec::new(),
			macros: &profile.macros,
		};

		state.update_layers();

		state
	}

	pub fn press_key(&mut self, key_id: KeyId) {
		if let Some(key) = self.get_key(key_id) {
			let macros: Vec<MacroState<'a>> = key
				.current_layer
				.macros
				.iter()
				.map(|i| {
					let macro_ = self.macros.get(*i as usize).unwrap();
					MacroState::from(macro_, key)
				})
				.collect();

			self.cut_channels(
				macros
					.iter()
					.flat_map(|m| m.macro_.cut_channels.iter().copied())
					.collect(),
			);

			self.running.extend(macros);
		}
	}

	fn get_key(&self, key_id: KeyId) -> Option<&KeyState<'a>> {
		self.keys.iter().find(|ks| ks.key.id == key_id)
	}

	pub fn release_key(&mut self, key_id: KeyId) {
		for macro_ in self.running.iter_mut() {
			if macro_.source.key == key_id {
				macro_.stop();
			}
		}
	}

	pub fn tick(&mut self, elapsed: Duration, events: &mut Vec<ActionEvent>) {
		let mut event_refs = Vec::new();

		for macro_ in self.running.iter_mut() {
			macro_.tick(elapsed, &mut event_refs);
		}

		self.running.retain(|macro_| !macro_.is_finished());

		for event in event_refs {
			events.push(event.clone());
		}
	}

	pub fn add_internal_tag(&mut self, tag: LayerTag) {
		self.tags.add_internal(tag);
		self.update_layers();
	}

	pub fn remove_internal_tag(&mut self, tag: LayerTag) {
		self.tags.remove_internal(tag);
		self.update_layers();
	}

	pub fn get_external_tags(&self) -> &[LayerTag] {
		&self.tags.external
	}

	pub fn set_external_tags(&mut self, tags: Vec<LayerTag>) {
		self.tags.set_external(tags);
		self.update_layers();
	}

	fn update_layers(&mut self) {
		for ks in self.keys.iter_mut() {
			let new_layer = ks.key.get_active_layer(&self.tags);

			if ks.current_layer.id != new_layer.id {
				// release macros that no longer have a valid source
				for macro_ in self
					.running
					.iter_mut()
					.filter(|m| m.source.key == ks.key.id && m.source.layer != new_layer.id)
				{
					macro_.stop();
				}
				ks.current_layer = new_layer;
			}
		}
	}

	fn cut_channels(&mut self, channels: Vec<Channel>) {
		for macro_ in self
			.running
			.iter_mut()
			.filter(|m| match m.macro_.play_channel {
				Some(channel) => channels.contains(&channel),
				None => false,
			}) {
			macro_.stop();
		}
	}

	fn map_keys_from_profile(profile: &'a KeyboardProfile) -> Vec<KeyState<'a>> {
		profile.keys.iter().map(KeyState::from).collect()
	}
}

struct KeyState<'a> {
	key: &'a DeviceKey,
	current_layer: &'a DeviceKeyLayer,
}

impl<'a> KeyState<'a> {
	pub fn from(key: &'a DeviceKey) -> Self {
		KeyState {
			key,
			current_layer: &key.default_layer,
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
	pub fn from(macro_: &'a Macro, source: &KeyState) -> Self {
		MacroState {
			macro_,
			current_sequence: CurrentSequence::Start(SequenceState::from(
				&macro_.start_sequence,
				0.millis(),
			)),
			trigger: TriggerState::Running,
			source: MacroSource {
				key: source.key.id,
				layer: source.current_layer.id,
			},
		}
	}

	pub fn tick(&mut self, mut elapsed: Duration, events: &mut Vec<&'a ActionEvent>) -> Duration {
		while !self.is_finished() && !elapsed.is_zero() {
			if let CurrentSequence::Start(ref mut seq)
			| CurrentSequence::Loop(ref mut seq)
			| CurrentSequence::End(ref mut seq) = self.current_sequence
			{
				elapsed = seq.tick(elapsed, events);

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
	key: KeyId,
	layer: LayerId,
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

	pub fn tick(&mut self, elapsed: Duration, events: &mut Vec<&'a ActionEvent>) -> Duration {
		self.elapsed += elapsed;

		while let Some(action) = self.pending.pop() {
			if action.predelay_ms <= self.elapsed.to_millis() {
				events.push(&action.action_event);
				self.elapsed -= action.predelay_ms.millis();
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

pub struct TagList {
	internal: Vec<LayerTag>,
	external: Vec<LayerTag>,
}

impl TagList {
	pub fn new() -> Self {
		TagList {
			internal: Vec::new(),
			external: Vec::new(),
		}
	}

	pub fn add_internal(&mut self, tag: LayerTag) {
		self.internal.push(tag);
	}

	pub fn remove_internal(&mut self, tag: LayerTag) {
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
			.chain(self.external.iter())
			.any(|tag| *tag == *value)
	}
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
	static CHANNEL_ID: Channel =
		Channel::new(Uuid::from_u128_le(0x2d3d340a_2e09_5cf6_9aad_d8e9415e4eff));
	static CHANNEL_ID2: Channel =
		Channel::new(Uuid::from_u128_le(0x70121fe9_d33e_5111_80bc_62cb534c4f73));
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

		state.tick(50.millis() as Duration, &mut vec![]);
		assert_eq!(state.elapsed, 50.millis() as Duration);

		state.tick(100.millis() as Duration, &mut vec![]);
		assert_eq!(state.elapsed, 150.millis() as Duration);

		state.tick(200.millis() as Duration, &mut vec![]);
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

		state.tick(100.millis(), &mut vec![]);
		assert_eq!(state.pending.len(), 1);

		state.tick(100.millis(), &mut vec![]);
		assert_eq!(state.pending.len(), 1);

		state.tick(200.millis(), &mut vec![]);
		assert_eq!(state.pending.len(), 1);

		state.tick(599.millis(), &mut vec![]);
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

		state.tick(99.millis(), &mut vec![]);
		assert_eq!(state.pending.len(), 2);

		state.tick(1.millis(), &mut vec![]);
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

		state.tick(299.millis(), &mut vec![]);
		assert_eq!(state.is_finished(), false);

		state.tick(1.millis(), &mut vec![]);
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

		state.tick(0.millis(), &mut vec![]);
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

		state.tick(400.millis(), &mut vec![]);
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

		state.tick(400.millis(), &mut events);
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
		let device_key = new_test_device_key(KEY_ID, vec![0]);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Start(_)
		));

		macro_state.tick(100.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn macro_loops() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![0]);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.tick(100.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.tick(200.millis(), &mut vec![]);
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
			id: MACRO_ID,
			name: "Name".to_string(),
			play_channel: Some(CHANNEL_ID),
		};
		let device_key = new_test_device_key(KEY_ID, vec![0]);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.tick(100.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.tick(300.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn macro_goes_to_end() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![0]);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.tick(100.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.stop();

		macro_state.tick(200.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn macro_ends() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![0]);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.tick(100.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.stop();

		macro_state.tick(200.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));

		macro_state.tick(300.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Finished
		));
	}

	#[test]
	fn macro_skips_to_end_when_released_during_start() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let device_key = new_test_device_key(KEY_ID, vec![0]);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&_macro, &key_state);

		macro_state.stop();

		macro_state.tick(100.millis(), &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));
	}

	// ------- KEYBOARD STATE TESTS --------

	#[test]
	fn pressing_a_key_starts_a_macro() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(vec![new_test_device_key(KEY_ID, vec![0])], vec![_macro]);
		let mut state = KeyboardState::from(&profile);

		assert_eq!(state.running.len(), 0);
		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);
	}

	#[test]
	fn keyboard_tick_updates_macros() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(vec![new_test_device_key(KEY_ID, vec![0])], vec![_macro]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Start(_)
		));

		state.tick(100.millis(), &mut vec![]);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));

		state.tick(200.millis(), &mut vec![]);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn releasing_a_key_stops_a_macro() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(vec![new_test_device_key(KEY_ID, vec![0])], vec![_macro]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		state.release_key(KEY_ID);

		state.tick(100.millis(), &mut vec![]);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn pressing_a_key_cuts_own_channel() {
		let _macro = new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID]);
		let profile = new_test_profile(vec![new_test_device_key(KEY_ID, vec![0])], vec![_macro]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 2);

		state.tick(100.millis(), &mut vec![]);

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
				new_test_device_key(key_1, vec![0]),
				new_test_device_key(key_2, vec![1]),
			],
			vec![macro_0, macro_1],
		);
		let mut state = KeyboardState::from(&profile);

		state.press_key(key_1);
		assert_eq!(state.running.len(), 1);

		state.press_key(key_2);
		assert_eq!(state.running.len(), 2);

		state.tick(100.millis(), &mut vec![]);

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

		let device_key = DeviceKey {
			id: KEY_ID,
			layers: vec![TaggedDeviceKeyLayer {
				layer: DeviceKeyLayer {
					id: LAYER_ID2,
					macros: vec![0],
				},
				tags: vec![LayerTag::new("test".to_string())],
				match_type: TagMatchType::All,
			}],
			default_layer: DeviceKeyLayer {
				id: LAYER_ID,
				macros: vec![1],
			},
		};

		let profile = new_test_profile(vec![device_key], macros);
		let mut state = KeyboardState::from(&profile);

		state.add_internal_tag(LayerTag::new("test".to_string()));

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

		let device_key = DeviceKey {
			id: KEY_ID,
			layers: vec![TaggedDeviceKeyLayer {
				layer: DeviceKeyLayer {
					id: LAYER_ID2,
					macros: vec![0],
				},
				tags: vec![LayerTag::new("test".to_string())],
				match_type: TagMatchType::All,
			}],
			default_layer: DeviceKeyLayer {
				id: LAYER_ID,
				macros: vec![1],
			},
		};

		let profile = new_test_profile(vec![device_key], macros);
		let mut state = KeyboardState::from(&profile);

		state.set_external_tags(vec![LayerTag::new("test".to_string())]);

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

		let device_key = DeviceKey {
			id: KEY_ID,
			layers: vec![TaggedDeviceKeyLayer {
				layer: DeviceKeyLayer {
					id: LAYER_ID2,
					macros: vec![1],
				},
				tags: vec![LayerTag::new("test".to_string())],
				match_type: TagMatchType::All,
			}],
			default_layer: DeviceKeyLayer {
				id: LAYER_ID,
				macros: vec![0],
			},
		};

		let profile = new_test_profile(vec![device_key], macros);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);

		assert_eq!(state.running[0].macro_.id, expected_macro_id);
	}

	// ------- HELPERS --------

	fn new_test_profile(keys: Vec<DeviceKey>, macros: Vec<Macro>) -> KeyboardProfile {
		KeyboardProfile { keys, macros }
	}

	fn new_test_device_key(id: KeyId, macros: Vec<u32>) -> DeviceKey {
		DeviceKey {
			id,
			layers: Vec::new(),
			default_layer: DeviceKeyLayer {
				id: LAYER_ID,
				macros,
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
			id,
			name: "Name".to_string(),
			play_channel: channel,
		}
	}
}
