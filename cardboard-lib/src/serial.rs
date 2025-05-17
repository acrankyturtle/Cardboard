use embassy_time::Duration;
use uuid::Uuid;

pub const TIMEOUT: Duration = Duration::from_millis(1000);

pub trait SerialPacketReader {
	async fn read_packet(&mut self, buf: &mut [u8]) -> Result<usize, &'static str>;
	const SIZE: usize;
}

pub trait SerialPacketSender {
	async fn write_packet(&mut self, data: &[u8]) -> Result<(), &'static str>;
	const SIZE: usize;
}

pub trait SerialReader {
	async fn read_exact(&mut self, to_fill: &mut [u8]) -> Result<(), &'static str>;
}

pub trait SerialWriter {
	async fn write_exact(&mut self, data: &[u8]) -> Result<(), &'static str>;
}

impl<T: SerialPacketSender> SerialWriter for T {
	async fn write_exact(&mut self, data: &[u8]) -> Result<(), &'static str> {
		let mut offset = 0;
		loop {
			let size = Self::SIZE.min(data.len() - offset);

			if size < 1 {
				break;
			}

			self.write_packet(&data[offset..offset + size]).await?;
			offset += size;
		}

		Ok(())
	}
}

pub struct BufferedReader<S: SerialPacketReader>
where
	[(); S::SIZE]:,
{
	buffer: SerialBuffer<{ S::SIZE }>,
	source: S,
}

impl<S: SerialPacketReader> BufferedReader<S>
where
	[(); S::SIZE]:,
{
	pub fn new(source: S) -> Self {
		Self {
			buffer: SerialBuffer::new(),
			source,
		}
	}

	async fn read_packet(&mut self) -> Result<(), &'static str> {
		let bytes_read = self.source.read_packet(&mut self.buffer.buffer).await?;
		self.buffer.skip = 0;
		self.buffer.length = bytes_read;
		Ok(())
	}
}

struct SerialBuffer<const SIZE: usize> {
	buffer: [u8; SIZE],
	skip: usize,
	length: usize,
}

impl<const SIZE: usize> SerialBuffer<SIZE> {
	fn new() -> Self {
		Self {
			buffer: [0; SIZE],
			skip: 0,
			length: 0,
		}
	}

	pub fn read_up_to(&mut self, to_fill: &mut [u8]) -> usize {
		let bytes_to_copy = self.length.min(to_fill.len());

		to_fill[..bytes_to_copy]
			.copy_from_slice(&self.buffer[self.skip..self.skip + bytes_to_copy]);

		self.skip += bytes_to_copy;
		self.length -= bytes_to_copy;
		bytes_to_copy
	}
}

impl<S: SerialPacketReader> SerialReader for BufferedReader<S>
where
	[(); S::SIZE]:,
{
	async fn read_exact(&mut self, to_fill: &mut [u8]) -> Result<(), &'static str> {
		let mut i = 0usize;

		let bytes_copied = self.buffer.read_up_to(to_fill);
		i += bytes_copied;

		while i < to_fill.len() {
			self.read_packet().await?;
			let bytes_read = self.buffer.read_up_to(&mut to_fill[i..]);

			i += bytes_read;
		}

		Ok(())
	}
}

pub trait SerialReaderExt: SerialReader {
	async fn read_u8(&mut self) -> Option<u8>;
	async fn read_u16(&mut self) -> Option<u16>;

	async fn read_u32(&mut self) -> Option<u32>;

	async fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str>;

	async fn read_uuid(&mut self) -> Option<Uuid>;
}

pub trait SerialWriterExt: SerialWriter {
	async fn write_u8(&mut self, value: u8) -> Result<(), &'static str>;

	async fn write_u16(&mut self, value: u16) -> Result<(), &'static str>;

	async fn write_u32(&mut self, value: u32) -> Result<(), &'static str>;

	async fn write_utf8(&mut self, value: &str) -> Result<(), &'static str>;
}

impl<T: SerialReader> SerialReaderExt for T {
	async fn read_u8(&mut self) -> Option<u8> {
		let mut buf = [0];
		self.read_exact(&mut buf).await.ok()?;
		Some(buf[0])
	}
	async fn read_u16(&mut self) -> Option<u16> {
		let mut buf = [0; 2];
		self.read_exact(&mut buf).await.ok()?;
		Some(u16::from_le_bytes(buf) as u16)
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

impl<T: SerialWriter> SerialWriterExt for T {
	async fn write_u8(&mut self, value: u8) -> Result<(), &'static str> {
		self.write_exact(&[value]).await
	}

	async fn write_u16(&mut self, value: u16) -> Result<(), &'static str> {
		let data: [u8; 2] = value.to_le_bytes();
		self.write_exact(&data).await
	}

	async fn write_u32(&mut self, value: u32) -> Result<(), &'static str> {
		let data: [u8; 4] = value.to_le_bytes();
		self.write_exact(&data).await
	}

	async fn write_utf8(&mut self, value: &str) -> Result<(), &'static str> {
		self.write_exact(value.as_bytes()).await
	}
}

#[cfg(all(not(test), feature = "embassy"))]
pub mod embassy {
	use super::*;
	use embassy_rp::peripherals::USB;
	use embassy_rp::usb::Driver;
	use embassy_time::Timer;
	use embassy_usb::class::cdc_acm::{Receiver, Sender};

	pub struct EmbassySerialPacketReader<'d, const SIZE: usize> {
		receiver: Receiver<'d, Driver<'d, USB>>,
		timeout: Duration,
	}

	pub struct EmbassySerialPacketWriter<'d, const SIZE: usize> {
		sender: Sender<'d, Driver<'d, USB>>,
		timeout: Duration,
	}

	impl<'d, const SIZE: usize> EmbassySerialPacketReader<'d, SIZE> {
		pub fn new(receiver: Receiver<'d, Driver<'d, USB>>, timeout: Duration) -> Self {
			Self { receiver, timeout }
		}
	}

	impl<'d, const SIZE: usize> EmbassySerialPacketWriter<'d, SIZE> {
		pub fn new(sender: Sender<'d, Driver<'d, USB>>, timeout: Duration) -> Self {
			Self { sender, timeout }
		}
	}

	impl<'d, const SIZE: usize> SerialPacketReader for EmbassySerialPacketReader<'d, SIZE> {
		async fn read_packet(&mut self, buf: &mut [u8]) -> Result<usize, &'static str> {
			let timer = Timer::after(self.timeout);

			let result = embassy_futures::select::select(self.receiver.read_packet(buf), async {
				timer.await
			})
			.await;

			match result {
				embassy_futures::select::Either::First(result) => {
					result.map_err(|_| "Endpoint error")
				}
				embassy_futures::select::Either::Second(_) => Err("Read timeout"),
			}
		}
		const SIZE: usize = SIZE;
	}

	impl<'d, const SIZE: usize> SerialPacketSender for EmbassySerialPacketWriter<'d, SIZE> {
		async fn write_packet(&mut self, data: &[u8]) -> Result<(), &'static str> {
			let timer = Timer::after(self.timeout);
			let result = embassy_futures::select::select(self.sender.write_packet(data), async {
				timer.await
			})
			.await;

			match result {
				embassy_futures::select::Either::First(result) => {
					result.map_err(|_| "Endpoint error")
				}
				embassy_futures::select::Either::Second(_) => Err("Write timeout"),
			}
		}
		const SIZE: usize = SIZE;
	}
}

#[cfg(test)]
mod tests {

	use std::collections::VecDeque;

	use super::*;

	struct DummySerialPacketReader<'a, const SIZE: usize> {
		packets: VecDeque<&'a [u8]>,
	}

	impl<const SIZE: usize> SerialPacketReader for DummySerialPacketReader<'_, SIZE> {
		async fn read_packet(&mut self, buf: &mut [u8]) -> Result<usize, &'static str> {
			if let Some(packet) = self.packets.pop_front() {
				let size = packet.len();

				if buf.len() < size {
					return Err("Buffer too small");
				}

				buf[..size].copy_from_slice(packet);
				Ok(size)
			} else {
				Err("No more packets")
			}
		}
		const SIZE: usize = SIZE;
	}

	#[tokio::test]
	async fn read_single_packet() {
		const PACKET_SIZE: usize = 2;
		let packet: [u8; PACKET_SIZE] = [0x01, 0x02];
		let reader = DummySerialPacketReader::<PACKET_SIZE> {
			packets: VecDeque::from(vec![packet.as_slice()]),
		};
		let mut serial_reader = BufferedReader::new(reader);
		let mut buffer = [0u8; 2];

		serial_reader.read_exact(&mut buffer).await.unwrap();
		assert_eq!(buffer, [0x01, 0x02]);
	}

	#[tokio::test]
	async fn read_multiple_packets() {
		const PACKET_SIZE: usize = 2;
		let packet1: [u8; PACKET_SIZE] = [0x01, 0x02];
		let packet2: [u8; PACKET_SIZE] = [0x03, 0x04];
		let reader = DummySerialPacketReader::<PACKET_SIZE> {
			packets: VecDeque::from(vec![packet1.as_slice(), packet2.as_slice()]),
		};
		let mut serial_reader = BufferedReader::new(reader);
		let mut buffer = [0u8; 4];

		serial_reader.read_exact(&mut buffer).await.unwrap();
		assert_eq!(buffer, [0x01, 0x02, 0x03, 0x04]);
	}

	#[tokio::test]
	async fn read_partial_packet() {
		const PACKET_SIZE: usize = 4;
		let packet: [u8; PACKET_SIZE] = [0x01, 0x02, 0x03, 0x04];
		let reader = DummySerialPacketReader::<PACKET_SIZE> {
			packets: VecDeque::from(vec![packet.as_slice()]),
		};
		let mut serial_reader = BufferedReader::new(reader);
		let mut buffer = [0u8; 2];

		serial_reader.read_exact(&mut buffer).await.unwrap();
		assert_eq!(buffer, [0x01, 0x02]);
	}

	#[tokio::test]
	async fn read_partial_packet_twice() {
		const PACKET_SIZE: usize = 4;
		let packet: [u8; PACKET_SIZE] = [0x01, 0x02, 0x03, 0x04];
		let reader = DummySerialPacketReader::<PACKET_SIZE> {
			packets: VecDeque::from(vec![packet.as_slice()]),
		};
		let mut serial_reader = BufferedReader::new(reader);
		let mut buffer = [0u8; 2];

		serial_reader.read_exact(&mut buffer).await.unwrap();
		serial_reader.read_exact(&mut buffer).await.unwrap();
		assert_eq!(buffer, [0x03, 0x04]);
	}
}
