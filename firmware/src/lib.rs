#![cfg_attr(not(test), no_std)]
#![feature(impl_trait_in_assoc_type)]
#![feature(generic_const_exprs)]

extern crate alloc;

use alloc::string::{String, ToString};
use core::{cell::UnsafeCell, mem::MaybeUninit};

use cardboard_lib::device::DeviceId;
use portable_atomic::{AtomicBool, Ordering};

pub mod rp2040;

pub fn get_serial_number<'a>(device_id: &DeviceId) -> &'static str {
	unsafe {
		static mut SERIAL_NUMBER: MaybeUninit<String> = MaybeUninit::uninit();
		SERIAL_NUMBER.write(device_id.to_string())
	}
}

/// Statically allocated, initialized at runtime cell.
///
/// It has two states: "empty" and "full". It is created "empty", and obtaining a reference
/// to the contents permanently changes it to "full". This allows that reference to be valid
/// forever.
///
/// If your value can be initialized as a `const` value, consider using [`ConstStaticCell`]
/// instead if you only need to take the value at runtime.
///
/// See the [crate-level docs](crate) for usage.
pub struct StaticCell<T> {
	used: AtomicBool,
	val: UnsafeCell<MaybeUninit<T>>,
}

unsafe impl<T> Send for StaticCell<T> {}
unsafe impl<T> Sync for StaticCell<T> {}

impl<T> StaticCell<T> {
	/// Create a new, empty `StaticCell`.
	///
	/// It can be initialized at runtime with [`StaticCell::init()`] or similar methods.
	#[inline]
	pub const fn new() -> Self {
		Self {
			used: AtomicBool::new(false),
			val: UnsafeCell::new(MaybeUninit::uninit()),
		}
	}

	/// Initialize the `StaticCell` with a value, returning a mutable reference to it.
	///
	/// Using this method, the compiler usually constructs `val` in the stack and then moves
	/// it into the `StaticCell`. If `T` is big, this is likely to cause stack overflows.
	/// Considering using [`StaticCell::init_with`] instead, which will construct it in-place inside the `StaticCell`.
	///
	/// # Panics
	///
	/// Panics if this `StaticCell` is already full.
	#[inline]
	#[allow(clippy::mut_from_ref)]
	pub fn init(&'static self, val: T) -> &'static mut T {
		self.uninit().write(val)
	}

	/// Initialize the `StaticCell` with the closure's return value, returning a mutable reference to it.
	///
	/// The advantage over [`StaticCell::init`] is that this method allows the closure to construct
	/// the `T` value in-place directly inside the `StaticCell`, saving stack space.
	///
	/// # Panics
	///
	/// Panics if this `StaticCell` is already full.
	#[inline]
	#[allow(clippy::mut_from_ref)]
	pub fn init_with(&'static self, val: impl FnOnce() -> T) -> &'static mut T {
		self.uninit().write(val())
	}

	/// Return a mutable reference to the uninitialized memory owned by the `StaticCell`.
	///
	/// Using this method directly is not recommended, but it can be used to construct `T` in-place directly
	/// in a guaranteed fashion.
	///
	/// # Panics
	///
	/// Panics if this `StaticCell` is already full.
	#[inline]
	#[allow(clippy::mut_from_ref)]
	pub fn uninit(&'static self) -> &'static mut MaybeUninit<T> {
		if let Some(val) = self.try_uninit() {
			val
		} else {
			panic!("`StaticCell` is already full, it can't be initialized twice.");
		}
	}

	/// Try initializing the `StaticCell` with a value, returning a mutable reference to it.
	///
	/// If this `StaticCell` is already full, it returns `None`.
	///
	/// Using this method, the compiler usually constructs `val` in the stack and then moves
	/// it into the `StaticCell`. If `T` is big, this is likely to cause stack overflows.
	/// Considering using [`StaticCell::try_init_with`] instead, which will construct it in-place inside the `StaticCell`.
	///
	/// Will only return a Some(&'static mut T) when the `StaticCell` was not yet initialized.
	#[inline]
	#[allow(clippy::mut_from_ref)]
	pub fn try_init(&'static self, val: T) -> Option<&'static mut T> {
		Some(self.try_uninit()?.write(val))
	}

	/// Try initializing the `StaticCell` with the closure's return value, returning a mutable reference to it.
	///
	/// If this `StaticCell` is already full, it returns `None`.
	///
	/// The advantage over [`StaticCell::init`] is that this method allows the closure to construct
	/// the `T` value in-place directly inside the `StaticCell`, saving stack space.
	///
	#[inline]
	#[allow(clippy::mut_from_ref)]
	pub fn try_init_with(&'static self, val: impl FnOnce() -> T) -> Option<&'static mut T> {
		Some(self.try_uninit()?.write(val()))
	}

	/// Try returning a mutable reference to the uninitialized memory owned by the `StaticCell`.
	///
	/// If this `StaticCell` is already full, it returns `None`.
	///
	/// Using this method directly is not recommended, but it can be used to construct `T` in-place directly
	/// in a guaranteed fashion.
	#[inline]
	pub fn try_uninit(&'static self) -> Option<&'static mut MaybeUninit<T>> {
		if self
			.used
			.compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
			.is_ok()
		{
			// SAFETY: We just checked that the value is not yet taken and marked it as taken.
			let val = unsafe { &mut *self.val.get() };
			Some(val)
		} else {
			None
		}
	}
}
