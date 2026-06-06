#[macro_export]
macro_rules! device_statics {
	(
		rows: $rows:expr,
		cols: $cols:expr,
		virtual_key_bitfield: $vkb:expr,
		heap_size: $heap_size:expr,
		flash_data_size: $flash_data_size:expr,
		settings: $settings:ty,
		keyboard: $keyboard:ty,
		mouse: $mouse:ty,
		consumer: $consumer:ty,
		mutex: $mutex:ty,
		context: $context:ty $(,)?
	) => {
		// heap
		pub type Heap = ::embedded_alloc::LlffHeap;
		const _HEAP_SIZE: usize = $heap_size;
		#[allow(static_mut_refs)]
		static mut HEAP: [u8; _HEAP_SIZE] = [0; _HEAP_SIZE];

		#[global_allocator]
		static ALLOCATOR: $crate::__reexports::TrackingAllocator<Heap> =
			$crate::__reexports::TrackingAllocator::new(Heap::empty(), _HEAP_SIZE);

		// flash buffer
		const _FLASH_DATA_SIZE: usize = $flash_data_size;
		#[link_section = ".profile"]
		#[allow(static_mut_refs)]
		static mut FLASH_DATA: ::core::mem::MaybeUninit<[u8; _FLASH_DATA_SIZE]> =
			::core::mem::MaybeUninit::uninit();

		// type aliases
		pub type Settings = $crate::__reexports::VersionedSettings<$settings>;
		pub type KeyboardImpl = $keyboard;
		pub type MouseImpl = $mouse;
		pub type ConsumerImpl = $consumer;
		pub type Mutex = $mutex;
		pub type DeviceSignal<T> = ::embassy_sync::signal::Signal<Mutex, T>;

		pub const VK_CHANNEL_CAP: usize = 8;
		pub type VirtualKeyChannel =
			::embassy_sync::channel::Channel<Mutex, [u8; $vkb], VK_CHANNEL_CAP>;

		pub type Matrix = $crate::__reexports::KeyMatrix<{ $rows }, { $cols }>;
		pub type ContextFlashMemory =
			$crate::__reexports::EmbassyFlashMemory<'static, { $crate::rp2040::flash::FLASH_SIZE }>;
		pub type ContextSerialReader = $crate::__reexports::BufferedReader<
			$crate::__reexports::EmbassySerialPacketReader<
				'static,
				{ $crate::rp2040::usb::USB_SERIAL_PACKET_SIZE },
			>,
		>;
		pub type ContextSerialWriter = $crate::__reexports::EmbassySerialPacketWriter<
			'static,
			{ $crate::rp2040::usb::USB_SERIAL_PACKET_SIZE },
		>;

		// signals & channels
		static HID_SIGNAL: DeviceSignal<
			$crate::__reexports::HidReport<
				{ <KeyboardImpl as $crate::__reexports::HidDevice<
					$crate::__reexports::KeyboardEvent,
				>>::SIZE },
				{ <MouseImpl as $crate::__reexports::HidDevice<
					$crate::__reexports::MouseEvent,
				>>::SIZE },
				{ <ConsumerImpl as $crate::__reexports::HidDevice<
					$crate::__reexports::ConsumerControlEvent,
				>>::SIZE },
			>,
		> = ::embassy_sync::signal::Signal::new();

		static PROFILE_CHANGED_SIGNAL: DeviceSignal<
			$crate::__reexports::KeyboardProfile,
		> = ::embassy_sync::signal::Signal::new();

		static EXTERNAL_TAGS_CHANGED_SIGNAL: DeviceSignal<
			::alloc::vec::Vec<$crate::__reexports::LayerTag>,
		> = ::embassy_sync::signal::Signal::new();

		static VIRTUAL_KEY_CHANNEL: VirtualKeyChannel =
			::embassy_sync::channel::Channel::new();

		// task wrappers
		#[::embassy_executor::task]
		async fn keypad_task(
			clock: &'static $crate::__reexports::EmbassyTickClock,
			matrix: Matrix,
			profile: $crate::__reexports::KeyboardProfile,
			hid: $crate::__reexports::EmbassyKeypadHid<KeyboardImpl, MouseImpl, ConsumerImpl, Mutex>,
			profile_changed: &'static DeviceSignal<$crate::__reexports::KeyboardProfile>,
			tags_changed: &'static DeviceSignal<
				::alloc::vec::Vec<$crate::__reexports::LayerTag>,
			>,
			virtual_keys_changed: &'static VirtualKeyChannel,
			bootloader_key: ::core::option::Option<$crate::__reexports::KeyId>,
			bootloader: &'static $crate::rp2040::bootloader::EmbassyRp2040RebootToBootloader,
			interval: $crate::__reexports::Duration,
		) {
			$crate::__reexports::keypad_task(
				clock,
				matrix,
				profile,
				hid,
				profile_changed,
				tags_changed,
				virtual_keys_changed,
				bootloader_key,
				bootloader,
				interval,
			)
			.await
		}

		#[::embassy_executor::task]
		async fn cmd_task(
			clock: &'static $crate::__reexports::EmbassyTickClock,
			cmds: ::alloc::vec::Vec<
				::alloc::boxed::Box<dyn $crate::__reexports::Command<$context>>,
			>,
			ctx: $context,
			timeout: $crate::__reexports::Duration,
		) {
			$crate::__reexports::cmd_task(clock, cmds, ctx, timeout).await
		}

		#[::embassy_executor::task]
		async fn hid_task(
			keyboard: ::embassy_usb::class::hid::HidWriter<
				'static,
				::embassy_rp::usb::Driver<'static, ::embassy_rp::peripherals::USB>,
				{ <KeyboardImpl as $crate::__reexports::HidDevice<
					$crate::__reexports::KeyboardEvent,
				>>::SIZE },
			>,
			mouse: ::core::option::Option<::embassy_usb::class::hid::HidWriter<
				'static,
				::embassy_rp::usb::Driver<'static, ::embassy_rp::peripherals::USB>,
				{ <MouseImpl as $crate::__reexports::HidDevice<
					$crate::__reexports::MouseEvent,
				>>::SIZE },
			>>,
			consumer: ::embassy_usb::class::hid::HidWriter<
				'static,
				::embassy_rp::usb::Driver<'static, ::embassy_rp::peripherals::USB>,
				{ <ConsumerImpl as $crate::__reexports::HidDevice<
					$crate::__reexports::ConsumerControlEvent,
				>>::SIZE },
			>,
			signal: &'static DeviceSignal<
				$crate::__reexports::HidReport<
					{ <KeyboardImpl as $crate::__reexports::HidDevice<
						$crate::__reexports::KeyboardEvent,
					>>::SIZE },
					{ <MouseImpl as $crate::__reexports::HidDevice<
						$crate::__reexports::MouseEvent,
					>>::SIZE },
					{ <ConsumerImpl as $crate::__reexports::HidDevice<
						$crate::__reexports::ConsumerControlEvent,
					>>::SIZE },
				>,
			>,
		) {
			$crate::rp2040::hid::hid_task(keyboard, mouse, consumer, signal).await
		}

		pub fn init_heap() {
			unsafe { ALLOCATOR.inner.init(::core::ptr::addr_of!(HEAP) as usize, _HEAP_SIZE) };
		}

		pub fn flash_data_ptr() -> *const u8 {
			::core::ptr::addr_of!(FLASH_DATA) as *const u8
		}
	};
}

#[macro_export]
macro_rules! spawn_standard_tasks {
	(
		spawner: $spawner:expr,
		config: $cfg:expr,
		boot: $boot:expr,
		ctx: $ctx:expr,
		cmds: $cmds:expr $(,)?
	) => {{
		let hid = $crate::__reexports::EmbassyKeypadHid {
			keyboard: KeyboardImpl::new(),
			mouse: MouseImpl::new(),
			consumer: ConsumerImpl::new(),
			signal: &HID_SIGNAL,
		};

		$spawner
			.spawn($crate::rp2040::usb::usb_task($boot.usb_device))
			.unwrap();

		let $crate::rp2040::bootstrap::HidWriters {
			keyboard,
			mouse,
			consumer,
		} = $boot.hid_writers;
		$spawner
			.spawn(hid_task(keyboard, mouse, consumer, &HID_SIGNAL))
			.unwrap();

		$spawner
			.spawn(keypad_task(
				$boot.clock,
				$boot.matrix,
				$boot.profile,
				hid,
				&PROFILE_CHANGED_SIGNAL,
				&EXTERNAL_TAGS_CHANGED_SIGNAL,
				&VIRTUAL_KEY_CHANNEL,
				$cfg.bootloader_key(),
				$boot.bootloader,
				$cfg.tick_interval,
			))
			.unwrap();

		$spawner
			.spawn(cmd_task($boot.clock, $cmds, $ctx, $cfg.serial.reset))
			.unwrap();
	}};
}
