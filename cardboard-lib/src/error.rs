use heapless::spsc::{Iter, Queue};
use serde::{Serialize, ser::SerializeStruct};

use crate::time::Instant;

#[derive(Clone)]
pub struct Error {
	pub timestamp: Instant,
	pub message: &'static str,
}

impl Serialize for Error {
	fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
	where
		S: serde::Serializer,
	{
		let mut state = serializer.serialize_struct("Error", 2)?;
		state.serialize_field("timestamp", &self.timestamp.ticks())?;
		state.serialize_field("message", &self.message)?;
		state.end()
	}
}

pub trait ErrorLog {
	fn push(&mut self, error: Error);
	fn get_errors(&self) -> Self::Iter<'_>;

	type Iter<'a>: Iterator<Item = &'a Error>
	where
		Self: 'a;
}

pub struct HeaplessSpscErrorLog<const N: usize> {
	queue: Queue<Error, N>,
}

impl<const N: usize> HeaplessSpscErrorLog<N> {
	pub const fn new() -> Self {
		Self {
			queue: Queue::new(),
		}
	}
}

impl<const N: usize> ErrorLog for HeaplessSpscErrorLog<N> {
	fn push(&mut self, error: Error) {
		let mut error = error;
		while let Err(e) = self.queue.enqueue(error) {
			error = e;
			self.queue.dequeue();
		}
	}

	fn get_errors(&self) -> Iter<Error> {
		self.queue.iter()
	}

	type Iter<'a> = Iter<'a, Error>;
}
