use alloc::vec::Vec;
use usbd_human_interface_device::page::Keyboard;

use crate::profile::KeyboardKey;

pub struct HidKeyboardState {
	keys_down: Vec<Keyboard>,
}

impl HidKeyboardState {
	pub fn new() -> Self {
		HidKeyboardState {
			keys_down: Vec::new(),
		}
	}

	pub fn key_down(&mut self, key: Keyboard) {
		self.keys_down.push(key);
	}

	pub fn key_up(&mut self, key: Keyboard) {
		if let Some(index) = self.keys_down.iter().position(|k| *k == key) {
			self.keys_down.remove(index);
		}
	}

	pub fn clear(&mut self) {
		self.keys_down.clear();
	}

	pub fn keys(&self) -> &Vec<Keyboard> {
		&self.keys_down
	}
}

impl Default for HidKeyboardState {
	fn default() -> Self {
		Self::new()
	}
}

pub fn map_key(key: &KeyboardKey) -> Keyboard {
	match key {
		KeyboardKey::A => Keyboard::A,
		KeyboardKey::B => Keyboard::B,
		KeyboardKey::C => Keyboard::C,
		KeyboardKey::D => Keyboard::D,
		KeyboardKey::E => Keyboard::E,
		KeyboardKey::F => Keyboard::F,
		KeyboardKey::G => Keyboard::G,
		KeyboardKey::H => Keyboard::H,
		KeyboardKey::I => Keyboard::I,
		KeyboardKey::J => Keyboard::J,
		KeyboardKey::K => Keyboard::K,
		KeyboardKey::L => Keyboard::L,
		KeyboardKey::M => Keyboard::M,
		KeyboardKey::N => Keyboard::N,
		KeyboardKey::O => Keyboard::O,
		KeyboardKey::P => Keyboard::P,
		KeyboardKey::Q => Keyboard::Q,
		KeyboardKey::R => Keyboard::R,
		KeyboardKey::S => Keyboard::S,
		KeyboardKey::T => Keyboard::T,
		KeyboardKey::U => Keyboard::U,
		KeyboardKey::V => Keyboard::V,
		KeyboardKey::W => Keyboard::W,
		KeyboardKey::X => Keyboard::X,
		KeyboardKey::Y => Keyboard::Y,
		KeyboardKey::Z => Keyboard::Z,
		KeyboardKey::ONE => Keyboard::Keyboard1,
		KeyboardKey::TWO => Keyboard::Keyboard2,
		KeyboardKey::THREE => Keyboard::Keyboard3,
		KeyboardKey::FOUR => Keyboard::Keyboard4,
		KeyboardKey::FIVE => Keyboard::Keyboard5,
		KeyboardKey::SIX => Keyboard::Keyboard6,
		KeyboardKey::SEVEN => Keyboard::Keyboard7,
		KeyboardKey::EIGHT => Keyboard::Keyboard8,
		KeyboardKey::NINE => Keyboard::Keyboard9,
		KeyboardKey::ZERO => Keyboard::Keyboard0,
		KeyboardKey::ENTER => Keyboard::ReturnEnter,
		KeyboardKey::ESCAPE => Keyboard::Escape,
		KeyboardKey::BACKSPACE => Keyboard::DeleteBackspace,
		KeyboardKey::TAB => Keyboard::Tab,
		KeyboardKey::SPACEBAR => Keyboard::Space,
		KeyboardKey::MINUS => Keyboard::Minus,
		KeyboardKey::EQUALS => Keyboard::Equal,
		KeyboardKey::LEFT_BRACKET => Keyboard::LeftBrace,
		KeyboardKey::RIGHT_BRACKET => Keyboard::RightBrace,
		KeyboardKey::BACKSLASH => Keyboard::Backslash,
		KeyboardKey::POUND => Keyboard::NonUSHash,
		KeyboardKey::SEMICOLON => Keyboard::Semicolon,
		KeyboardKey::QUOTE => Keyboard::Apostrophe,
		KeyboardKey::GRAVE_ACCENT => Keyboard::Grave,
		KeyboardKey::COMMA => Keyboard::Comma,
		KeyboardKey::PERIOD => Keyboard::Dot,
		KeyboardKey::FORWARD_SLASH => Keyboard::ForwardSlash,
		KeyboardKey::CAPS_LOCK => Keyboard::CapsLock,
		KeyboardKey::F1 => Keyboard::F1,
		KeyboardKey::F2 => Keyboard::F2,
		KeyboardKey::F3 => Keyboard::F3,
		KeyboardKey::F4 => Keyboard::F4,
		KeyboardKey::F5 => Keyboard::F5,
		KeyboardKey::F6 => Keyboard::F6,
		KeyboardKey::F7 => Keyboard::F7,
		KeyboardKey::F8 => Keyboard::F8,
		KeyboardKey::F9 => Keyboard::F9,
		KeyboardKey::F10 => Keyboard::F10,
		KeyboardKey::F11 => Keyboard::F11,
		KeyboardKey::F12 => Keyboard::F12,
		KeyboardKey::PRINT_SCREEN => Keyboard::PrintScreen,
		KeyboardKey::SCROLL_LOCK => Keyboard::ScrollLock,
		KeyboardKey::PAUSE => Keyboard::Pause,
		KeyboardKey::INSERT => Keyboard::Insert,
		KeyboardKey::HOME => Keyboard::Home,
		KeyboardKey::PAGE_UP => Keyboard::PageUp,
		KeyboardKey::DELETE => Keyboard::DeleteForward,
		KeyboardKey::END => Keyboard::End,
		KeyboardKey::PAGE_DOWN => Keyboard::PageDown,
		KeyboardKey::RIGHT_ARROW => Keyboard::RightArrow,
		KeyboardKey::LEFT_ARROW => Keyboard::LeftArrow,
		KeyboardKey::DOWN_ARROW => Keyboard::DownArrow,
		KeyboardKey::UP_ARROW => Keyboard::UpArrow,
		KeyboardKey::KEYPAD_NUMLOCK => Keyboard::KeypadNumLockAndClear,
		KeyboardKey::KEYPAD_FORWARD_SLASH => Keyboard::KeypadDivide,
		KeyboardKey::KEYPAD_ASTERISK => Keyboard::KeypadMultiply,
		KeyboardKey::KEYPAD_MINUS => Keyboard::KeypadSubtract,
		KeyboardKey::KEYPAD_PLUS => Keyboard::KeypadAdd,
		KeyboardKey::KEYPAD_ENTER => Keyboard::KeypadEnter,
		KeyboardKey::KEYPAD_ONE => Keyboard::Keypad1,
		KeyboardKey::KEYPAD_TWO => Keyboard::Keypad2,
		KeyboardKey::KEYPAD_THREE => Keyboard::Keypad3,
		KeyboardKey::KEYPAD_FOUR => Keyboard::Keypad4,
		KeyboardKey::KEYPAD_FIVE => Keyboard::Keypad5,
		KeyboardKey::KEYPAD_SIX => Keyboard::Keypad6,
		KeyboardKey::KEYPAD_SEVEN => Keyboard::Keypad7,
		KeyboardKey::KEYPAD_EIGHT => Keyboard::Keypad8,
		KeyboardKey::KEYPAD_NINE => Keyboard::Keypad9,
		KeyboardKey::KEYPAD_ZERO => Keyboard::Keypad0,
		KeyboardKey::KEYPAD_PERIOD => Keyboard::KeypadDot,
		KeyboardKey::KEYPAD_BACKSLASH => Keyboard::NonUSBackslash,
		KeyboardKey::APPLICATION => Keyboard::Application,
		KeyboardKey::KEYPAD_EQUALS => Keyboard::KeypadEqual,
		KeyboardKey::F13 => Keyboard::F13,
		KeyboardKey::F14 => Keyboard::F14,
		KeyboardKey::F15 => Keyboard::F15,
		KeyboardKey::F16 => Keyboard::F16,
		KeyboardKey::F17 => Keyboard::F17,
		KeyboardKey::F18 => Keyboard::F18,
		KeyboardKey::F19 => Keyboard::F19,
		KeyboardKey::F20 => Keyboard::F20,
		KeyboardKey::F21 => Keyboard::F21,
		KeyboardKey::F22 => Keyboard::F22,
		KeyboardKey::F23 => Keyboard::F23,
		KeyboardKey::F24 => Keyboard::F24,
		KeyboardKey::MENU => Keyboard::Menu,
		KeyboardKey::LEFT_CONTROL => Keyboard::LeftControl,
		KeyboardKey::LEFT_SHIFT => Keyboard::LeftShift,
		KeyboardKey::LEFT_ALT => Keyboard::LeftAlt,
		KeyboardKey::LEFT_GUI => Keyboard::LeftGUI,
		KeyboardKey::RIGHT_CONTROL => Keyboard::RightControl,
		KeyboardKey::RIGHT_SHIFT => Keyboard::RightShift,
		KeyboardKey::RIGHT_ALT => Keyboard::RightAlt,
		KeyboardKey::RIGHT_GUI => Keyboard::RightGUI,
	}
}
