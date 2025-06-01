#[cfg(test)]
mod defmt_mock {
	use std::sync::Mutex;
	use std::time::{SystemTime, UNIX_EPOCH};

	// Mock timestamp for defmt
	defmt::timestamp! {
		"{}",
		SystemTime::now()
			.duration_since(UNIX_EPOCH)
			.unwrap()
			.as_millis()
	}

	// Mock critical section implementation
	static CRITICAL_SECTION: Mutex<()> = Mutex::new(());

	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _critical_section_1_0_acquire() -> u8 {
		CRITICAL_SECTION.lock().unwrap();
		1 // Return non-zero to indicate lock acquired
	}

	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _critical_section_1_0_release(_state: u8) {
		// Mutex is automatically released when the lock goes out of scope
	}

	// Mock defmt logging backend
	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _defmt_write(_data: *const u8, len: usize) {
		let slice = std::slice::from_raw_parts(_data, len);
		if let Ok(s) = std::str::from_utf8(slice) {
			print!("{}", s); // Output to stdout
		}
	}

	// Mock defmt panic handler
	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _defmt_panic() -> ! {
		panic!("defmt panic in test");
	}

	// Mock defmt acquire
	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _defmt_acquire() {
		// No-op
	}

	// Mock defmt release
	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _defmt_release() {
		// No-op
	}

	// Mock defmt flush
	#[unsafe(no_mangle)]
	pub unsafe extern "C" fn _defmt_flush() {
		use std::io::Write;
		std::io::stdout().flush().unwrap();
	}

	// Mock logging level markers
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_TRACE_START: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_TRACE_END: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_DEBUG_START: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_DEBUG_END: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_INFO_START: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_INFO_END: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_WARN_START: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_WARN_END: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_ERROR_START: u8 = 0;
	#[unsafe(no_mangle)]
	pub static __DEFMT_MARKER_ERROR_END: u8 = 0;
}
