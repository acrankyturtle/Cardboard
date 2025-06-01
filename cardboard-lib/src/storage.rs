use crate::profile::KeyboardProfile;

pub trait FlashMemory {
    fn as_slice(&self) -> &'static [u8];
    fn erase_all(&mut self) -> Result<(), &'static str>;
    fn write(&mut self, offset: usize, data: &[u8]) -> Result<(), &'static str>;

    const SIZE: usize;
}

const LENGTH_SIZE: usize = 2; // 2 bytes for length

pub fn load_profile_from_flash<F: FlashMemory>(
    flash: &mut F,
) -> Result<KeyboardProfile, &'static str> {
    let data = flash.as_slice();
    let length = u16::from_le_bytes([data[0], data[1]]) as usize;

    KeyboardProfile::from_json_bytes(&data[LENGTH_SIZE..LENGTH_SIZE + length])
}
