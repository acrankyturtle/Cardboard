use embassy_futures::select::{select, Either};
use embassy_rp::peripherals::USB;
use embassy_rp::usb::Driver;
use embassy_time::{Duration, Timer};
use embassy_usb::class::cdc_acm::{Receiver, Sender};
use uuid::Uuid;

pub const TIMEOUT: Duration = Duration::from_millis(1000);

pub trait SerialReceiver {
	async fn read_exact(&mut self, to_fill: &mut [u8]) -> Result<(), &'static str>;

	async fn wait_connection(&mut self);
}

pub trait SerialSender {
	async fn write_exact(&mut self, data: &[u8]) -> Result<(), &'static str>;
}

pub trait ChunkedSerialReceiver {
	async fn read_chunk(&mut self, to_fill: &mut [u8; Self::SIZE]) -> Result<(), &'static str>;
	const SIZE: usize;
}

pub trait ChunkedSerialSender {
	async fn write_chunk_size(&self) -> usize;
}

pub struct BufferedReader<'d, const SIZE: usize> {
	buffer: Option<SerialBuffer<SIZE>>,
	receiver: Receiver<'d, Driver<'d, USB>>,
}

impl<'d, const SIZE: usize> ChunkedSerialReceiver for BufferedReader<'d, SIZE> {
	async fn read_chunk(&mut self, to_fill: &mut [u8; Self::SIZE]) -> Result<(), &'static str> {
		self.read_exact(to_fill).await
	}

	const SIZE: usize = SIZE;
}

impl<'d, const SIZE: usize> BufferedReader<'d, SIZE> {
	pub fn new(receiver: Receiver<'d, Driver<'d, USB>>) -> Self {
		Self {
			buffer: None,
			receiver,
		}
	}

	pub fn clear(&mut self) {
		self.buffer = None;
	}
}

struct SerialBuffer<const SIZE: usize> {
	buffer: [u8; SIZE],
	skip: usize,
	length: usize,
}

impl<const SIZE: usize> SerialBuffer<SIZE> {
	pub fn copy_to(&self, to_fill: &mut [u8]) -> usize {
		let bytes_to_copy = self.length.min(to_fill.len());
		to_fill[..bytes_to_copy]
			.copy_from_slice(&self.buffer[self.skip..self.skip + bytes_to_copy]);
		bytes_to_copy
	}
}

impl<const SIZE: usize> SerialReceiver for BufferedReader<'_, SIZE> {
	async fn read_exact(&mut self, to_fill: &mut [u8]) -> Result<(), &'static str> {
		let mut i = 0usize;

		// try to read from the buffer first
		if let Some(b) = &self.buffer {
			let bytes_copied = b.copy_to(to_fill);
			i += bytes_copied;
			self.buffer = if bytes_copied < b.length {
				Some(SerialBuffer {
					buffer: b.buffer,
					skip: b.skip + bytes_copied,
					length: b.length - bytes_copied,
				})
			} else {
				None
			};
		}

		while i < to_fill.len() {
			let read_packet_future = async {
				let mut buffer = [0u8; SIZE];
				match self.receiver.read_packet(&mut buffer).await {
					Ok(bytes_read) => Ok((
						if bytes_read < SIZE {
							Some(SerialBuffer {
								buffer,
								skip: bytes_read,
								length: bytes_read,
							})
						} else {
							None
						},
						bytes_read,
					)),
					Err(_) => Err("Endpoint error"),
				}
			};

			let timeout_future = async { Timer::after(TIMEOUT).await };

			let bytes_read = match select(read_packet_future, timeout_future).await {
				Either::First(result) => match result {
					Ok((Some(buffer), bytes_read)) => {
						self.buffer = Some(buffer);
						Ok(bytes_read)
					}
					Ok((None, bytes_read)) => {
						self.buffer = None;
						Ok(bytes_read)
					}
					Err(err) => return Err(err),
				},
				Either::Second(_) => Err("Read timeout"),
			}?;

			i += bytes_read;
		}

		Ok(())
	}

	async fn wait_connection(&mut self) {
		self.receiver.wait_connection().await;
	}
}

pub trait SerialReader {
	async fn read_u8(&mut self) -> Option<u8>;
	async fn read_u16(&mut self) -> Option<u32>;

	async fn read_u32(&mut self) -> Option<u32>;

	async fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str>;

	async fn read_uuid(&mut self) -> Option<Uuid>;
}

impl<R: SerialReceiver> SerialReader for R {
	async fn read_u8(&mut self) -> Option<u8> {
		let mut buf = [0];
		self.read_exact(&mut buf).await.ok()?;
		Some(buf[0])
	}
	async fn read_u16(&mut self) -> Option<u32> {
		let mut buf = [0; 2];
		self.read_exact(&mut buf).await.ok()?;
		Some(u16::from_le_bytes(buf) as u32)
	}

	async fn read_u32(&mut self) -> Option<u32> {
		let mut buf = [0; 4];
		self.read_exact(&mut buf).await.ok()?;
		Some(u32::from_le_bytes(buf))
	}

	async fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str> {
		self.read_exact(buf).await.ok()?;
		core::str::from_utf8(buf).ok()
	}

	async fn read_uuid(&mut self) -> Option<Uuid> {
		let mut buf = [0; 16];
		self.read_exact(&mut buf).await.ok()?;
		Uuid::from_slice_le(&buf).ok()
	}
}

pub struct BufferedWriter<'d, const SIZE: usize> {
	writer: Sender<'d, Driver<'d, USB>>,
}

impl<'d, const SIZE: usize> BufferedWriter<'d, SIZE> {
	pub fn new(writer: Sender<'d, Driver<'d, USB>>) -> Self {
		Self { writer }
	}
}

impl<const SIZE: usize> SerialSender for BufferedWriter<'_, SIZE> {
	async fn write_exact(&mut self, data: &[u8]) -> Result<(), &'static str> {
		let mut offset = 0;
		loop {
			let size = (self.writer.max_packet_size() as usize).min(data.len() - offset);

			if size < 1 {
				break;
			}

			self.writer
				.write_packet(&data[offset..offset + size])
				.await
				.map_err(|_| "Endpoint error")?;
			offset += size;
		}

		Ok(())
	}
}

impl<'d, const SIZE: usize> ChunkedSerialSender for BufferedWriter<'d, SIZE> {
	async fn write_chunk_size(&self) -> usize {
		self.writer.max_packet_size() as usize
	}
}
