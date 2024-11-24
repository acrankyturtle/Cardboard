use core::borrow::BorrowMut;

use defmt::{debug, error, info};
use generic_array::ArrayLength;
use rp2040_hal::usb::UsbBus;
use usbd_serial::{embedded_io::Read, SerialPort};

use crate::{
	command::DeviceInfo, hid::HidState, profile::KeyboardProfile, state::CurrentProfile,
	storage::FlashStorage, Error,
};

pub struct Device<'a, ProfileSize: ArrayLength<u8>, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> {
	pub device_info: DeviceInfo,
	pub profile_storage: FlashStorage<ProfileSize>,
	pub current_profile: CurrentProfile,
	pub serial_port: SerialPort<'a, UsbBus, RS, WS>,
	pub hid: HidState,
}

impl<ProfileSize: ArrayLength<u8>, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> ContextDeviceInfo
	for Device<'_, ProfileSize, RS, WS>
{
	fn get_device_info(&self) -> &DeviceInfo {
		&self.device_info
	}
}

impl<ProfileSize: ArrayLength<u8>, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> ContextProfileStorage
	for Device<'_, ProfileSize, RS, WS>
{
	fn get_profile_storage(&mut self) -> &mut FlashStorage<ProfileSize> {
		&mut self.profile_storage
	}

	type SIZE = ProfileSize;
}

impl<ProfileSize: ArrayLength<u8>, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> ContextCurrentProfile
	for Device<'_, ProfileSize, RS, WS>
{
	fn get_current_profile(&mut self) -> &mut CurrentProfile {
		&mut self.current_profile
	}
}

impl<'a, ProfileSize: ArrayLength<u8>, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>>
	ContextSerialPort<'a> for Device<'a, ProfileSize, RS, WS>
{
	fn get_serial_port(&mut self) -> &mut SerialPort<'a, UsbBus, Self::RS, Self::WS> {
		&mut self.serial_port
	}

	type RS = RS;
	type WS = WS;
}

impl<ProfileSize: ArrayLength<u8>, RS: BorrowMut<[u8]>, WS: BorrowMut<[u8]>> ContextHidState
	for Device<'_, ProfileSize, RS, WS>
{
	fn get_hid_state(&mut self) -> &mut HidState {
		&mut self.hid
	}
}

pub trait ContextDeviceInfo {
	fn get_device_info(&self) -> &DeviceInfo;
}

pub trait ContextProfileStorage {
	fn get_profile_storage(&mut self) -> &mut FlashStorage<Self::SIZE>;

	type SIZE: ArrayLength<u8>;
}

pub trait ContextCurrentProfile {
	fn get_current_profile(&mut self) -> &mut CurrentProfile;
}

pub trait ContextSerialPort<'a> {
	fn get_serial_port(&mut self) -> &mut SerialPort<'a, UsbBus, Self::RS, Self::WS>;

	type RS: BorrowMut<[u8]>;
	type WS: BorrowMut<[u8]>;
}

pub trait ContextHidState {
	fn get_hid_state(&mut self) -> &mut HidState;
}

pub fn load_profile<Context>(ctx: &mut Context) -> Result<(), Error>
where
	Context: ContextProfileStorage + ContextCurrentProfile + ContextHidState,
{
	let profile = KeyboardProfile::from_json_bytes(ctx.get_profile_storage().get())?;
	info!("Loaded profile with {} keys", profile.keys.len());

	let current_profile = ctx.get_current_profile();
	*current_profile = CurrentProfile::from(profile);
	ctx.get_hid_state().reset();
	Ok(())
}

// reads the profile from the serial port and writes it to the profile storage in blocks
pub fn write_profile_from_reader<'a, Context>(len: usize, ctx: &mut Context) -> Result<(), Error>
where
	Context: ContextProfileStorage + ContextSerialPort<'a>,
{
	if len == 0 {
		error!("Profile length is 0");
		return Err(Error::Unknown);
	}

	debug!("boutta erase profile storage");

	// erase old profile (ensure erase multiple of 4096)
	let rem = len % 4096;
	let erase_len = if rem != 0 { len + (4096 - rem) } else { len };
	ctx.get_profile_storage().erase(0, erase_len)?;

	const BLOCK_SIZE: usize = 4 * 1024;

	debug!("len: {}", len);

	// let mut pos = 0;
	// while pos < len {
	// 	let read_len = if len - pos > BLOCK_SIZE {
	// 		BLOCK_SIZE
	// 	} else {
	// 		len - pos
	// 	};
	// 	let mut buf = [0; BLOCK_SIZE];

	// 	ctx.get_serial_port()
	// 		.read_exact(&mut buf[..read_len])
	// 		.map_err(|_| {
	// 			error!("Error reading profile from serial port.");
	// 			Error::Unknown
	// 		})?;

	// 	let write_len = if read_len < BLOCK_SIZE {
	// 		// pad to multiple of 256
	// 		let rem = read_len % 256;
	// 		if rem != 0 {
	// 			let pad = 256 - rem;
	// 			read_len + pad
	// 		} else {
	// 			read_len
	// 		}
	// 	} else {
	// 		BLOCK_SIZE
	// 	};
	// 	ctx.get_profile_storage().write(pos, &buf[..write_len])?;

	// 	pos += read_len;
	// }

	// */BROKEN*/
	// read/write profile in chunks
	// let mut offset = 0;
	// while len > 0 {
	// 	let read_len = if len > BLOCK_SIZE { BLOCK_SIZE } else { len };
	// 	let mut buf = [0; BLOCK_SIZE];

	// 	let num_read = ctx
	// 		.get_serial_port()
	// 		.read(&mut buf[..read_len])
	// 		.map_err(|_| {
	// 			error!("Error reading from serial port");
	// 			Error::Unknown
	// 		})?;

	// 	if num_read != read_len {
	// 		error!(
	// 			"Unexpected end of stream. Expected {} bytes, got {}.",
	// 			read_len, num_read
	// 		);
	// 		return Err(Error::Unknown);
	// 	}

	// 	let write_len = if read_len < BLOCK_SIZE {
	// 		// pad to multiple of 256
	// 		let rem = read_len % 256;
	// 		if rem != 0 {
	// 			let pad = 256 - rem;
	// 			read_len + pad
	// 		} else {
	// 			read_len
	// 		}
	// 	} else {
	// 		BLOCK_SIZE
	// 	};
	// 	ctx.get_profile_storage().write(offset, &buf[..write_len])?;

	// 	len -= read_len;
	// 	offset += read_len;
	// }

	Ok(())
}
