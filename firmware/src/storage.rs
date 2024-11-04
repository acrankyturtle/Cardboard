use littlefs2::{
	consts::{U2, U256},
	driver::Storage,
};
use rp2040_hal::rom_data::{flash_range_erase, flash_range_program};

pub struct ProfileStorage<const PROFILE_SIZE: usize> {
	profile: [u8; PROFILE_SIZE],
	offset: usize,
}

impl<const PROFILE_SIZE: usize> ProfileStorage<PROFILE_SIZE> {
	pub fn new(profile: [u8; PROFILE_SIZE], flash_offset: usize) -> Self {
		ProfileStorage {
			profile,
			offset: flash_offset,
		}
	}
}

impl<const PROFILE_SIZE: usize> Storage for ProfileStorage<PROFILE_SIZE> {
	const READ_SIZE: usize = 64;
	const WRITE_SIZE: usize = 256;
	const BLOCK_SIZE: usize = 4096;
	const BLOCK_COUNT: usize = PROFILE_SIZE / Self::BLOCK_SIZE;

	type CACHE_SIZE = U256;

	type LOOKAHEAD_SIZE = U2;

	fn read(&mut self, off: usize, buf: &mut [u8]) -> littlefs2::io::Result<usize> {
		let len = buf.len().min(PROFILE_SIZE - off);
		buf.copy_from_slice(&self.profile[off..off + len]);
		Ok(len)
	}

	fn write(&mut self, off: usize, data: &[u8]) -> littlefs2::io::Result<usize> {
		let len = data.len().min(PROFILE_SIZE - off);

		if len > PROFILE_SIZE - off {
			return Err(littlefs2::io::Error::NoSpace); // todo: is this the right error?
		}

		unsafe {
			flash_range_program(self.offset as u32, data.as_ptr(), data.len());
		}

		Ok(len)
	}

	fn erase(&mut self, off: usize, len: usize) -> littlefs2::io::Result<usize> {
		let len = len.min(PROFILE_SIZE - off);

		unsafe {
			flash_range_erase(self.offset as u32, len, Self::BLOCK_SIZE as u32, 0);
		}

		Ok(len)
	}
}
