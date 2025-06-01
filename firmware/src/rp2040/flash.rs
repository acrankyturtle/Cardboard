use cardboard_lib::{device::DeviceId, embassy::EmbassyFlashMemory};
use defmt::error;
use embassy_rp::{
	flash::{Async, Flash},
	peripherals::{DMA_CH0, FLASH},
};
use embassy_time::Timer;
use uuid::Uuid;

const FLASH_ADDR: *const u8 = 0x10000000 as *const u8;
pub const FLASH_SIZE: usize = 2 * 1024 * 1024; // 2 MB

pub async fn init_flash<const PROFILE_SIZE: usize>(
	profile_data: *const [u8; PROFILE_SIZE],
	flash: FLASH,
	dma_ch0: DMA_CH0,
) -> (EmbassyFlashMemory<'static, FLASH_SIZE>, DeviceId) {
	// wait to initialize flash
	Timer::after_millis(10).await;
	let mut flash_memory = Flash::<_, Async, FLASH_SIZE>::new(flash, dma_ch0);
	let device_id = get_device_id(&mut flash_memory).unwrap();
	let flash = EmbassyFlashMemory::new(
		FLASH_ADDR,
		profile_data as *const u8,
		PROFILE_SIZE,
		flash_memory,
	);

	(flash, device_id)
}

fn get_device_id(
	flash_memory: &mut Flash<'static, FLASH, Async, FLASH_SIZE>,
) -> Result<DeviceId, &'static str> {
	let mut bytes = [0u8; 8];
	flash_memory.blocking_unique_id(&mut bytes).map_err(|e| {
		error!("Failed to read unique ID from flash: {}", e);
		"Failed to read unique ID from flash"
	})?;

	let unique_id = u64::from_le_bytes(bytes);
	let uuid = (unique_id as u128) << 64 | (unique_id as u128);
	Ok(DeviceId::new(Uuid::from_u128_le(uuid)))
}
