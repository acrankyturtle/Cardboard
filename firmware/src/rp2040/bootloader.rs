use cardboard_lib::context::RebootToBootloader;
use embassy_rp::rom_data::reset_to_usb_boot;

pub struct EmbassyRp2040RebootToBootloader;

impl RebootToBootloader for EmbassyRp2040RebootToBootloader {
	fn reboot_to_bootloader(&self) -> ! {
		reset_to_usb_boot(0, 0);
		loop {} // halt
	}
}
