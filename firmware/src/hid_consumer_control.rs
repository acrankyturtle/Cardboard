use alloc::collections::VecDeque;

use usbd_human_interface_device::{device::consumer::MultipleConsumerReport, page::Consumer};

use crate::profile::ConsumerControlEvent;

pub struct HidKeyboardState {
	keys_down: VecDeque<Consumer>,
}

impl HidKeyboardState {
	pub fn new() -> Self {
		HidKeyboardState {
			keys_down: VecDeque::new(),
		}
	}

	pub fn key_down(&mut self, key: Consumer) {
		self.keys_down.push_back(key);
	}

	pub fn clear(&mut self) {
		self.keys_down.clear();
	}

	pub fn report(&mut self) -> MultipleConsumerReport {
		let mut codes = [Consumer::Unassigned; 4];
		let num = self.keys_down.len().min(codes.len());

		for i in 0..num {
			codes[i] = self.keys_down.pop_front().unwrap();
		}

		MultipleConsumerReport { codes }
	}
}

impl Default for HidKeyboardState {
	fn default() -> Self {
		Self::new()
	}
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
