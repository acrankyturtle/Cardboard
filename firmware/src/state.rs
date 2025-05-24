extern crate alloc;

use core::fmt;

use crate::profile::*;
use crate::TagList;
use alloc::vec::Vec;
use cardboard_lib::input::KeyId;

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

	// pub fn update_key_profile(&mut self, profile: &'a KeyboardProfile) {
	// 	self.keys = KeyboardState::map_keys_from_profile(profile);

	// 	// release all
	// 	for macro_ in self.macros.iter_mut() {
	// 		macro_.stop();
	// 	}

	// 	self.update_layers();
	// }

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

	pub fn tick(&mut self, elapsed_ms: u32, events: &mut Vec<ActionEvent>) {
		let mut event_refs = Vec::new();

		for macro_ in self.running.iter_mut() {
			macro_.tick(elapsed_ms, &mut event_refs);
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
				0,
			)),
			trigger: TriggerState::Running,
			source: MacroSource {
				key: source.key.id,
				layer: source.current_layer.id,
			},
		}
	}

	pub fn tick(&mut self, elapsed_ms: u32, events: &mut Vec<&'a ActionEvent>) -> u32 {
		let mut elapsed_ms = elapsed_ms;

		while !self.is_finished() && elapsed_ms > 0 {
			if let CurrentSequence::Start(ref mut seq)
			| CurrentSequence::Loop(ref mut seq)
			| CurrentSequence::End(ref mut seq) = self.current_sequence
			{
				elapsed_ms = seq.tick(elapsed_ms, events);

				if seq.is_finished() {
					self.move_to_next_seq(elapsed_ms);

					if let CurrentSequence::Loop(seq) = &self.current_sequence {
						if seq.is_finished() {
							break;
						}
					}
				}
			}
		}

		elapsed_ms
	}

	pub fn is_finished(&self) -> bool {
		matches!(self.current_sequence, CurrentSequence::Finished)
	}

	fn stop(&mut self) {
		self.trigger = TriggerState::Stopping;
	}

	fn move_to_next_seq(&mut self, elapsed_ms: u32) {
		match self.current_sequence {
			CurrentSequence::Start(_) => match self.trigger {
				TriggerState::Running => self.move_to_loop(elapsed_ms),
				TriggerState::Stopping => self.move_to_end(elapsed_ms),
			},
			CurrentSequence::Loop(_) => match self.trigger {
				TriggerState::Running => self.move_to_loop(elapsed_ms),
				TriggerState::Stopping => self.move_to_end(elapsed_ms),
			},
			CurrentSequence::End(_) => {
				self.current_sequence = CurrentSequence::Finished;
			}
			CurrentSequence::Finished => {}
		}
	}

	fn move_to_loop(&mut self, elapsed_ms: u32) {
		self.current_sequence =
			CurrentSequence::Loop(SequenceState::from(&self.macro_.loop_sequence, elapsed_ms));
	}

	fn move_to_end(&mut self, elapsed_ms: u32) {
		self.current_sequence =
			CurrentSequence::End(SequenceState::from(&self.macro_.end_sequence, elapsed_ms));
	}
}

struct MacroSource {
	key: KeyId,
	layer: LayerId,
}

struct SequenceState<'a> {
	pending: Vec<&'a Action>,
	elapsed_ms: u32,
}

impl<'a> SequenceState<'a> {
	fn from(sequence: &'a Sequence, elapsed_ms: u32) -> Self {
		SequenceState {
			pending: sequence.actions.iter().rev().collect(),
			elapsed_ms,
		}
	}

	pub fn tick(&mut self, elapsed_ms: u32, events: &mut Vec<&'a ActionEvent>) -> u32 {
		self.elapsed_ms += elapsed_ms;

		while let Some(action) = self.pending.pop() {
			if action.predelay_ms <= self.elapsed_ms {
				events.push(&action.action_event);
				self.elapsed_ms -= action.predelay_ms;
			} else {
				self.pending.push(action);
				return 0;
			}
		}

		self.elapsed_ms
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

#[cfg(test)]
mod tests {
	use super::*;
	use alloc::string::ToString;
	use alloc::vec;
	use uuid::Uuid;

	static KEY_ID: KeyId =
		KeyId::new(Uuid::parse_str("d1472104-1c37-560f-a39b-1737983559fc").unwrap());
	static KEY_ID2: KeyId =
		KeyId::new(Uuid::parse_str("5661275b-eba1-5c7b-b7cc-f8f8dd08d3b7").unwrap());
	static MACRO_ID: MacroId =
		MacroId::new(Uuid::parse_str("140acba7-4971-5b36-af21-ce478b891606").unwrap());
	static MACRO_ID2: MacroId =
		MacroId::new(Uuid::parse_str("1326a82d-af4c-5e64-8619-ed6686415550").unwrap());
	static CHANNEL_ID: Channel =
		Channel::new(Uuid::parse_str("2d3d340a-2e09-5cf6-9aad-d8e9415e4eff").unwrap());
	static CHANNEL_ID2: Channel =
		Channel::new(Uuid::parse_str("70121fe9-d33e-5111-80bc-62cb534c4f73").unwrap());
	static LAYER_ID: LayerId =
		LayerId::new(Uuid::parse_str("6e30c4c9-8e84-5e71-a303-6fc00ca31d68").unwrap());
	static LAYER_ID2: LayerId =
		LayerId::new(Uuid::parse_str("2cb2145a-6fd1-59e3-8b2e-bd8160f9924c").unwrap());

	// ------- SEQUENCE TESTS --------

	#[test]
	fn sequence_accumulates_elapsed_time() {
		let sequence = Sequence {
			actions: vec![Action {
				predelay_ms: 1000,
				action_event: ActionEvent::None,
			}],
		};

		let mut state = SequenceState::from(&sequence, 0);
		assert_eq!(state.elapsed_ms, 0);

		state.tick(50, &mut vec![]);
		assert_eq!(state.elapsed_ms, 50);

		state.tick(100, &mut vec![]);
		assert_eq!(state.elapsed_ms, 150);

		state.tick(200, &mut vec![]);
		assert_eq!(state.elapsed_ms, 350);
	}

	#[test]
	fn sequence_doesnt_pop_actions_while_accumulating() {
		let sequence = Sequence {
			actions: vec![Action {
				predelay_ms: 1000,
				action_event: ActionEvent::None,
			}],
		};

		let mut state = SequenceState::from(&sequence, 0);
		assert_eq!(state.pending.len(), 1);

		state.tick(100, &mut vec![]);
		assert_eq!(state.pending.len(), 1);

		state.tick(100, &mut vec![]);
		assert_eq!(state.pending.len(), 1);

		state.tick(200, &mut vec![]);
		assert_eq!(state.pending.len(), 1);

		state.tick(599, &mut vec![]);
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

		let mut state = SequenceState::from(&sequence, 0);
		assert_eq!(state.pending.len(), 2);

		state.tick(99, &mut vec![]);
		assert_eq!(state.pending.len(), 2);

		state.tick(1, &mut vec![]);
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

		let mut state = SequenceState::from(&sequence, 0);
		assert_eq!(state.is_finished(), false);

		state.tick(299, &mut vec![]);
		assert_eq!(state.is_finished(), false);

		state.tick(1, &mut vec![]);
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

		let mut state = SequenceState::from(&sequence, 0);
		assert_eq!(state.pending.len(), 1);

		state.tick(0, &mut vec![]);
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

		let mut state = SequenceState::from(&sequence, 0);
		assert_eq!(state.pending.len(), 3);

		state.tick(400, &mut vec![]);
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
					action_event: ActionEvent::Mouse(MouseEvent::Move((0, 0))),
				},
				Action {
					predelay_ms: 100,
					action_event: ActionEvent::Keyboard(KeyboardEvent::KeyUp(KeyboardKey::A)),
				},
			],
		};

		let mut state = SequenceState::from(&sequence, 0);
		let mut events = vec![];

		state.tick(400, &mut events);
		assert_eq!(events.len(), 3);

		assert!(matches!(
			events[0],
			ActionEvent::Keyboard(KeyboardEvent::KeyDown(KeyboardKey::A))
		));
		assert!(matches!(
			events[1],
			ActionEvent::Mouse(MouseEvent::Move((0, 0)))
		));
		assert!(matches!(
			events[2],
			ActionEvent::Keyboard(KeyboardEvent::KeyUp(KeyboardKey::A))
		));
	}

	// ------- MACRO TESTS --------
	#[test]
	fn macro_moves_to_loop_sequence() {
		let device_key = new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&device_key.default_layer.macros[0], &key_state);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Start(_)
		));

		macro_state.tick(100, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn macro_loops() {
		let device_key = new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&device_key.default_layer.macros[0], &key_state);

		macro_state.tick(100, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.tick(200, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn macro_with_empty_loop_still_loops() {
		let device_key = new_test_device_key(
			KEY_ID,
			vec![Macro {
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
			}],
		);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&device_key.default_layer.macros[0], &key_state);

		macro_state.tick(100, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.tick(300, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn macro_goes_to_end() {
		let device_key = new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&device_key.default_layer.macros[0], &key_state);

		macro_state.tick(100, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.stop();

		macro_state.tick(200, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn macro_ends() {
		let device_key = new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&device_key.default_layer.macros[0], &key_state);

		macro_state.tick(100, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Loop(_)
		));

		macro_state.stop();

		macro_state.tick(200, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));

		macro_state.tick(300, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::Finished
		));
	}

	#[test]
	fn macro_skips_to_end_when_released_during_start() {
		let device_key = new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		);

		let key_state = KeyState::from(&device_key);
		let mut macro_state = MacroState::from(&device_key.default_layer.macros[0], &key_state);

		macro_state.stop();

		macro_state.tick(100, &mut vec![]);
		assert!(matches!(
			macro_state.current_sequence,
			CurrentSequence::End(_)
		));
	}

	// ------- KEYBOARD STATE TESTS --------

	#[test]
	fn pressing_a_key_starts_a_macro() {
		let profile = new_test_profile(vec![new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		)]);
		let mut state = KeyboardState::from(&profile);

		assert_eq!(state.running.len(), 0);
		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);
	}

	#[test]
	fn keyboard_tick_updates_macros() {
		let profile = new_test_profile(vec![new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		)]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Start(_)
		));

		state.tick(100, &mut vec![]);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));

		state.tick(200, &mut vec![]);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn releasing_a_key_stops_a_macro() {
		let profile = new_test_profile(vec![new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		)]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		state.release_key(KEY_ID);

		state.tick(100, &mut vec![]);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn pressing_a_key_cuts_own_channel() {
		let profile = new_test_profile(vec![new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		)]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 1);

		state.press_key(KEY_ID);
		assert_eq!(state.running.len(), 2);

		state.tick(100, &mut vec![]);

		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn pressing_a_key_cuts_other_channel() {
		let key_1 = KEY_ID;
		let key_2 = KEY_ID2;

		let profile = new_test_profile(vec![
			new_test_device_key(
				key_1,
				vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![])],
			),
			new_test_device_key(
				key_2,
				vec![new_test_macro(
					MACRO_ID,
					Some(CHANNEL_ID2),
					vec![CHANNEL_ID],
				)],
			),
		]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(key_1);
		assert_eq!(state.running.len(), 1);

		state.press_key(key_2);
		assert_eq!(state.running.len(), 2);

		state.tick(100, &mut vec![]);

		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
		assert!(matches!(
			state.running[1].current_sequence,
			CurrentSequence::Loop(_)
		));
	}

	#[test]
	fn updating_profile_releases_macros() {
		let profile = new_test_profile(vec![new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		)]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);

		let new_profile = new_test_profile(vec![new_test_device_key(
			KEY_ID,
			vec![new_test_macro(MACRO_ID, Some(CHANNEL_ID), vec![CHANNEL_ID])],
		)]);
		state.update_key_profile(&new_profile);

		state.tick(100, &mut vec![]);
		assert!(matches!(
			state.running[0].current_sequence,
			CurrentSequence::End(_)
		));
	}

	#[test]
	fn internal_tags_affect_macro_selection() {
		let expected_macro_id = MACRO_ID2;
		let other_macro_id = MACRO_ID;

		let device_key = DeviceKey {
			id: KEY_ID,
			layers: vec![TaggedDeviceKeyLayer {
				layer: DeviceKeyLayer {
					id: LAYER_ID2,
					macros: vec![new_test_macro(
						expected_macro_id,
						Some(CHANNEL_ID),
						vec![CHANNEL_ID],
					)],
				},
				tags: vec![LayerTag::new("test".to_string())],
				match_type: TagMatchType::All,
			}],
			default_layer: DeviceKeyLayer {
				id: LAYER_ID,
				macros: vec![new_test_macro(
					other_macro_id,
					Some(CHANNEL_ID),
					vec![CHANNEL_ID],
				)],
			},
		};

		let profile = new_test_profile(vec![device_key]);
		let mut state = KeyboardState::from(&profile);

		state.add_internal_tags(vec![LayerTag::new("test".to_string())]);

		state.press_key(KEY_ID);

		assert_eq!(state.running[0].macro_.id, expected_macro_id);
	}

	#[test]
	fn external_tags_affect_macro_selection() {
		let expected_macro_id = MACRO_ID2;
		let other_macro_id = MACRO_ID;

		let device_key = DeviceKey {
			id: KEY_ID,
			layers: vec![TaggedDeviceKeyLayer {
				layer: DeviceKeyLayer {
					id: LAYER_ID2,
					macros: vec![new_test_macro(
						expected_macro_id,
						Some(CHANNEL_ID),
						vec![CHANNEL_ID],
					)],
				},
				tags: vec![LayerTag::new("test".to_string())],
				match_type: TagMatchType::All,
			}],
			default_layer: DeviceKeyLayer {
				id: LAYER_ID,
				macros: vec![new_test_macro(
					other_macro_id,
					Some(CHANNEL_ID),
					vec![CHANNEL_ID],
				)],
			},
		};

		let profile = new_test_profile(vec![device_key]);
		let mut state = KeyboardState::from(&profile);

		state.set_external_tags(vec![LayerTag::new("test".to_string())]);

		state.press_key(KEY_ID);

		assert_eq!(state.running[0].macro_.id, expected_macro_id);
	}

	#[test]
	fn internal_tags_dont_affect_macro_selection_when_not_set() {
		let expected_macro_id = MACRO_ID;
		let other_macro_id = MACRO_ID2;

		let device_key = DeviceKey {
			id: KEY_ID,
			layers: vec![TaggedDeviceKeyLayer {
				layer: DeviceKeyLayer {
					id: LAYER_ID2,
					macros: vec![new_test_macro(
						other_macro_id,
						Some(CHANNEL_ID),
						vec![CHANNEL_ID],
					)],
				},
				tags: vec![LayerTag::new("test".to_string())],
				match_type: TagMatchType::All,
			}],
			default_layer: DeviceKeyLayer {
				id: LAYER_ID,
				macros: vec![new_test_macro(
					expected_macro_id,
					Some(CHANNEL_ID),
					vec![CHANNEL_ID],
				)],
			},
		};

		let profile = new_test_profile(vec![device_key]);
		let mut state = KeyboardState::from(&profile);

		state.press_key(KEY_ID);

		assert_eq!(state.running[0].macro_.id, expected_macro_id);
	}

	// ------- HELPERS --------

	fn new_test_profile(keys: Vec<DeviceKey>) -> KeyboardProfile {
		KeyboardProfile {
			keys,
			macros: vec![],
		}
	}

	fn new_test_device_key(id: KeyId, macros: Vec<Macro>) -> DeviceKey {
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
