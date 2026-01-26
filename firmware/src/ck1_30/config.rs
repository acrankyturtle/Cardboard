//! Variant-specific configuration for CK1-30
//!
//! Build with:
//!   cargo build --release --bin ck1_30                     # Default (no variant)
//!   cargo build --release --bin ck1_30 --features variant-blk  # BLK variant
//!   cargo build --release --bin ck1_30 --features variant-wht  # WHT variant

use cardboard_lib::device::DeviceVariant;

/// Variant identifier for device info
#[cfg(feature = "variant-blk")]
pub const VARIANT: Option<DeviceVariant> = Some(DeviceVariant::new("BLK"));

#[cfg(feature = "variant-wht")]
pub const VARIANT: Option<DeviceVariant> = Some(DeviceVariant::new("WHT"));

#[cfg(not(any(feature = "variant-blk", feature = "variant-wht")))]
pub const VARIANT: Option<DeviceVariant> = None;

/// USB product name (e.g., "CK1-30 BLK")
#[cfg(feature = "variant-blk")]
pub const USB_MODEL: &str = "CK1-30 BLK";

#[cfg(feature = "variant-wht")]
pub const USB_MODEL: &str = "CK1-30 WHT";

#[cfg(not(any(feature = "variant-blk", feature = "variant-wht")))]
pub const USB_MODEL: &str = "CK1-30";
