use defmt::error;
use rp2040_hal::rom_data::{flash_range_erase, flash_range_program};

use crate::{profile::KeyboardProfile, Error};

pub struct FlashStorage<const SIZE: usize> {
	buf: &'static [u8; SIZE],
}

impl<const SIZE: usize> FlashStorage<SIZE> {
	pub fn new(buf: &'static [u8; SIZE]) -> Self {
		FlashStorage { buf }
	}

	fn get_ptr(&self) -> *const u8 {
		self.buf.as_ptr()
	}

	pub fn get(&self) -> &[u8; SIZE] {
		self.buf
	}

	pub fn write(&mut self, offset: usize, buf: &[u8]) -> Result<(), Error> {
		if offset + buf.len() > SIZE {
			return Err(Error::Unknown);
		}

		let offset = self.get_ptr() as usize + offset;
		if offset % 256 != 0 {
			error!("Invalid offset: {}", offset);
			return Err(Error::Unknown);
		}

		if buf.len() % 256 != 0 {
			error!("Invalid buffer size: {}", buf.len());
			return Err(Error::Unknown);
		}

		unsafe {
			flash_range_program(offset as u32, buf.as_ptr(), buf.len());
		}

		Ok(())
	}

	pub fn erase(&mut self, offset: usize, len: usize) -> Result<(), Error> {
		if offset + len > SIZE {
			return Err(Error::Unknown);
		}

		let offset = self.get_ptr() as usize + offset;
		if offset % 4096 != 0 {
			error!("Invalid offset: {}", offset);
			return Err(Error::Unknown);
		}

		if len % 4096 != 0 {
			error!("Invalid length: {}", len);
			return Err(Error::Unknown);
		}

		unsafe {
			flash_range_erase(offset as u32, len, 4096, 0);
		}

		Ok(())
	}
}

// impl<const SIZE: usize> Storage for FlashStorage<SIZE> {
// 	const READ_SIZE: usize = 64;
// 	const WRITE_SIZE: usize = 256;
// 	const BLOCK_SIZE: usize = 4096;
// 	const BLOCK_COUNT: usize = SIZE / Self::BLOCK_SIZE;

// 	type CACHE_SIZE = U256;

// 	type LOOKAHEAD_SIZE = U2;

// 	fn read(&mut self, off: usize, buf: &mut [u8]) -> littlefs2::io::Result<usize> {
// 		let read_size = Self::READ_SIZE;
// 		debug_assert!(off % read_size == 0);
// 		debug_assert!(buf.len() % read_size == 0);

// 		let len = buf.len();
// 		buf.copy_from_slice(&self.buf[off..off + len]);
// 		Ok(len)
// 	}

// 	fn write(&mut self, off: usize, data: &[u8]) -> littlefs2::io::Result<usize> {
// 		let write_size = Self::WRITE_SIZE;
// 		debug_assert!(off % write_size == 0);
// 		debug_assert!(data.len() % write_size == 0);
// 		debug_assert!(data.len() + off <= SIZE);

// 		let offset = self.buf.as_ptr() as u32 + off as u32;

// 		info!("write offset: {}, write len: {}", offset, data.len());

// 		// unsafe {
// 		// 	flash_range_program(offset, data.as_ptr(), data.len());
// 		// }

// 		Ok(data.len())
// 	}

// 	fn erase(&mut self, off: usize, len: usize) -> littlefs2::io::Result<usize> {
// 		let erase_size = Self::BLOCK_SIZE;
// 		debug_assert!(off % erase_size == 0);
// 		debug_assert!(len % erase_size == 0);
// 		debug_assert!(len + off <= SIZE);

// 		let offset = self.buf.as_ptr() as u32 + off as u32;

// 		info!("erase offset: {}, write len: {}", offset, len);

// 		// unsafe {
// 		// 	flash_range_erase(offset, len, Self::BLOCK_SIZE as u32, 0);
// 		// }

// 		Ok(len)
// 	}
// }

pub trait ProfileStorage {
	fn read(&self) -> Result<KeyboardProfile, Error>;

	fn write(&mut self, profile: &KeyboardProfile) -> Result<(), Error>;
}

pub struct ProfileFlashStorage<const SIZE: usize> {
	pub storage: FlashStorage<SIZE>,
}

impl<const SIZE: usize> ProfileStorage for ProfileFlashStorage<SIZE> {
	fn read(&self) -> Result<KeyboardProfile, Error> {
		serde_json_core::from_slice::<KeyboardProfile>(self.storage.get())
			.map(|(profile, _)| profile)
			.map_err(|_| Error::Unknown)
	}

	fn write(&mut self, profile: &KeyboardProfile) -> Result<(), Error> {
		let mut buf = [0; SIZE];
		let size = serde_json_core::to_slice(profile, &mut buf).map_err(|_| Error::Unknown)?;

		if size > SIZE {
			error!("Profile size too large: {}", size);
			return Err(Error::Unknown);
		}

		self.storage.write(0, &buf[..size])
	}
}
