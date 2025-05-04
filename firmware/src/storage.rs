use defmt::{error, info};
use embassy_rp::{
	flash::{Async, Flash, ERASE_SIZE, WRITE_SIZE},
	peripherals::FLASH,
};

use crate::profile::KeyboardProfile;

pub trait FlashMemory {
	fn as_slice(&self) -> &'static [u8];
	fn erase_all(&mut self) -> Result<(), &'static str>;
	fn write(&mut self, offset: usize, data: &[u8]) -> Result<(), &'static str>;

	const SIZE: usize;
}

pub struct EmbassyFlashMemory<'d, const SIZE: usize> {
	flash_addr: *const u8,
	storage_addr: *const u8,
	length: usize,
	flash: Flash<'d, FLASH, Async, SIZE>,
}

impl<'d, const SIZE: usize> EmbassyFlashMemory<'d, SIZE> {
	pub fn new(
		flash_addr: *const u8,
		storage_addr: *const u8,
		length: usize,
		flash: Flash<'d, FLASH, Async, SIZE>,
	) -> Self {
		if storage_addr as usize % WRITE_SIZE != 0 {
			error!(
				"Base address is not write block aligned: {}",
				storage_addr as usize
			);
			panic!("Base address is not write block aligned");
		}

		if storage_addr as usize % ERASE_SIZE != 0 {
			error!(
				"Base address is not erase block aligned: {}",
				storage_addr as usize
			);
			panic!("Base address is not erase block aligned");
		}

		if length % WRITE_SIZE != 0 {
			error!("Length is not block aligned: {}", length);
			panic!("Length is not block aligned");
		}

		if length % ERASE_SIZE != 0 {
			error!("Length is not erase block aligned: {}", length);
			panic!("Length is not erase block aligned");
		}

		EmbassyFlashMemory {
			flash_addr,
			storage_addr,
			length,
			flash,
		}
	}

	fn get_flash_offset(&self) -> usize {
		self.storage_addr as usize - self.flash_addr as usize
	}

	fn get_flash_end_offset(&self) -> usize {
		self.get_flash_offset() + self.length
	}
}

impl<'a, const SIZE: usize> FlashMemory for EmbassyFlashMemory<'a, SIZE> {
	fn as_slice(&self) -> &'static [u8] {
		unsafe { core::slice::from_raw_parts(self.storage_addr, self.length) }
	}

	fn erase_all(&mut self) -> Result<(), &'static str> {
		self.flash
			.blocking_erase(
				self.get_flash_offset() as u32,
				self.get_flash_end_offset() as u32,
			)
			.map_err(|e| {
				error!("Error erasing flash memory: {:?}", e);
				"Error erasing flash memory"
			})
	}

	fn write(&mut self, offset: usize, data: &[u8]) -> Result<(), &'static str> {
		if offset + data.len() > self.length {
			error!(
				"Write out of bounds: {} + {} > {}",
				offset,
				data.len(),
				self.length
			);
			return Err("Write out of bounds");
		}

		if offset % WRITE_SIZE != 0 {
			error!("Offset is not block aligned ({}): {}", WRITE_SIZE, offset);
			return Err("Offset is not block aligned");
		}

		if data.len() % WRITE_SIZE != 0 {
			error!(
				"Length is not block aligned ({}): {}",
				WRITE_SIZE,
				data.len()
			);
			return Err("Length is not block aligned");
		}

		self.flash
			.blocking_write(self.get_flash_offset() as u32 + offset as u32, data)
			.map_err(|e| {
				error!("Error writing to flash memory: {:?}", e);
				"Error writing to flash memory"
			})
	}

	const SIZE: usize = SIZE;
}

const LENGTH_SIZE: usize = 2; // 2 bytes for length

pub fn load_profile_from_flash<F: FlashMemory>(
	flash: &mut F,
) -> Result<KeyboardProfile, &'static str> {
	let data = flash.as_slice();
	let length = u16::from_le_bytes([data[0], data[1]]) as usize;

	info!("Profile length: {}", length);
	info!(
		"Profile data: {:?}",
		&data[LENGTH_SIZE..LENGTH_SIZE + length]
	);

	KeyboardProfile::from_json_bytes(&data[LENGTH_SIZE..LENGTH_SIZE + length])
}
