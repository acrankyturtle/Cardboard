use async_trait::async_trait;
use cardboard_lib::input::RowPin;
use embassy_rp::gpio::Output;

#[async_trait(?Send)]
impl RowPin for Output<'_> {
	async fn set_high(&mut self) {
		self.set_high();
	}

	async fn set_low(&mut self) {
		self.set_low();
	}
}

#[async_trait(?Send)]
impl ColPin for Input<'_> {
	async fn is_high(&self) -> bool {
		self.is_high()
	}
}
