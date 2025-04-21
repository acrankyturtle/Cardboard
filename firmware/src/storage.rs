use defmt::error;
use embassy_rp::{
	flash::{Async, Flash, ERASE_SIZE, WRITE_SIZE},
	peripherals::FLASH,
};

pub trait FlashMemory {
	fn as_slice(&self) -> &'static [u8];
	fn erase_all(&mut self) -> Result<(), &'static str>;
	fn write(&mut self, offset: usize, data: &[u8]) -> Result<(), &'static str>;

	const SIZE: usize;
}

pub struct EmbassyFlashMemory<'d, const SIZE: usize> {
	base_addr: *const u8,
	flash: Flash<'d, FLASH, Async, SIZE>,
}

impl<'d, const SIZE: usize> EmbassyFlashMemory<'d, SIZE> {
	pub unsafe fn new(base_addr: *const u8, flash: Flash<'d, FLASH, Async, SIZE>) -> Self {
		if base_addr as usize % WRITE_SIZE != 0 {
			error!(
				"Base address is not write block aligned: {}",
				base_addr as usize
			);
			panic!("Base address is not write block aligned");
		}

		if base_addr as usize % ERASE_SIZE != 0 {
			error!(
				"Base address is not erase block aligned: {}",
				base_addr as usize
			);
			panic!("Base address is not erase block aligned");
		}

		EmbassyFlashMemory { base_addr, flash }
	}

	pub fn get_flash_offset(&self, offset: usize) -> usize {
		self.base_addr as usize + offset
	}
}

impl<'a, const SIZE: usize> FlashMemory for EmbassyFlashMemory<'a, SIZE> {
	fn as_slice(&self) -> &'static [u8] {
		unsafe { core::slice::from_raw_parts(self.base_addr, SIZE) }
	}

	fn erase_all(&mut self) -> Result<(), &'static str> {
		let base_addr = self.base_addr as u32;
		self.flash
			.blocking_erase(base_addr as u32, base_addr + SIZE as u32)
			.map_err(|e| {
				error!("Error erasing flash memory: {:?}", e);
				"Error erasing flash memory"
			})
	}

	fn write(&mut self, offset: usize, data: &[u8]) -> Result<(), &'static str> {
		if offset + data.len() > SIZE {
			error!(
				"Write out of bounds: {} + {} > {}",
				offset,
				data.len(),
				SIZE
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

		self.flash.blocking_write(offset as u32, data).map_err(|e| {
			error!("Error writing to flash memory: {:?}", e);
			"Error writing to flash memory"
		})
	}

	const SIZE: usize = SIZE;
}
