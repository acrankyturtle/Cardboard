use uuid::Uuid;

use crate::Error;

pub trait SerialPort {
	async fn read(&mut self, buf: &mut [u8]) -> Result<(), Error>;
	async fn write(&mut self, buf: &[u8]) -> Result<(), Error>;

	async fn read_u8(&mut self) -> Option<u8> {
		let mut buf = [0];
		self.read(&mut buf).await.ok()?;
		Some(buf[0])
	}
	async fn read_u16(&mut self) -> Option<u32> {
		let mut buf = [0; 2];
		self.read(&mut buf).await.ok()?;
		Some(u16::from_le_bytes(buf) as u32)
	}

	async fn read_u32(&mut self) -> Option<u32> {
		let mut buf = [0; 4];
		self.read(&mut buf).await.ok()?;
		Some(u32::from_le_bytes(buf))
	}

	async fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str> {
		self.read(buf).await.ok()?;
		core::str::from_utf8(buf).ok()
	}

	async fn read_uuid(&mut self) -> Option<Uuid> {
		let mut buf = [0; 16];
		self.read(&mut buf).await.ok()?;
		Uuid::from_slice_le(&buf).ok()
	}

	async fn write_u8(&mut self, val: u8) -> Result<(), Error> {
		self.write(&val.to_le_bytes()).await
	}

	async fn write_u16(&mut self, val: u16) -> Result<(), Error> {
		self.write(&val.to_le_bytes()).await
	}

	async fn write_u32(&mut self, val: u32) -> Result<(), Error> {
		self.write(&val.to_le_bytes()).await
	}

	async fn write_utf8(&mut self, val: &str) -> Result<(), Error> {
		self.write(val.as_bytes()).await
	}

	async fn write_uuid(&mut self, val: Uuid) -> Result<(), Error> {
		self.write(&val.as_bytes().as_slice()).await
	}
}
