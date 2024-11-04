use core::borrow::{Borrow, BorrowMut};

pub struct SerialReadBufferStore([u8; 256]);

impl Default for SerialReadBufferStore {
	fn default() -> Self {
		Self([0u8; 256])
	}
}

impl Borrow<[u8]> for SerialReadBufferStore {
	fn borrow(&self) -> &[u8] {
		&self.0
	}
}

impl BorrowMut<[u8]> for SerialReadBufferStore {
	fn borrow_mut(&mut self) -> &mut [u8] {
		&mut self.0
	}
}

pub struct SerialWriteBufferStore([u8; 256]);

impl Default for SerialWriteBufferStore {
	fn default() -> Self {
		Self([0u8; 256])
	}
}

impl Borrow<[u8]> for SerialWriteBufferStore {
	fn borrow(&self) -> &[u8] {
		&self.0
	}
}

impl BorrowMut<[u8]> for SerialWriteBufferStore {
	fn borrow_mut(&mut self) -> &mut [u8] {
		&mut self.0
	}
}
