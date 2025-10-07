use uuid::Uuid;

pub trait Read {
	async fn read_exact(&mut self, to_fill: &mut [u8]) -> Result<(), &'static str>;
}

pub trait Write {
	async fn write_exact(&mut self, data: &[u8]) -> Result<(), &'static str>;
}

pub trait ReadExt: Read {
	async fn read_u8(&mut self) -> Option<u8>;
	async fn read_u16(&mut self) -> Option<u16>;

	async fn read_u32(&mut self) -> Option<u32>;

	async fn read_utf8<'a>(&mut self, buf: &'a mut [u8]) -> Option<&'a str>;

	async fn read_uuid(&mut self) -> Option<Uuid>;
}

pub trait WriteExt: Write {
	async fn write_u8(&mut self, value: u8) -> Result<(), &'static str>;

	async fn write_u16(&mut self, value: u16) -> Result<(), &'static str>;

	async fn write_u32(&mut self, value: u32) -> Result<(), &'static str>;

	async fn write_utf8(&mut self, value: &str) -> Result<(), &'static str>;
}

impl<T: Read> ReadExt for T {
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

impl<T: Write> WriteExt for T {
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