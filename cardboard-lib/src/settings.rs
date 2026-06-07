use crate::serialize::{Readable, Writeable};
use crate::stream::{ReadAsync, ReadAsyncExt, WriteAsync, WriteAsyncExt};

/// Trait for device-specific settings. Each firmware implements this.
pub trait SettingsData: Sized + Default {
	/// Current version of this settings format. Increment when format changes.
	const VERSION: u32;

	/// Read settings fields (without version prefix).
	async fn read_data<R: ReadAsync>(reader: &mut R) -> Result<Self, &'static str>;

	/// Write settings fields (without version prefix).
	async fn write_data<W: WriteAsync>(&self, writer: &mut W) -> Result<(), &'static str>;
}

/// Wrapper that handles version serialization automatically.
/// Binary format: [u32 version][settings data...]
pub struct VersionedSettings<T: SettingsData> {
	pub inner: T,
}

impl<T: SettingsData> VersionedSettings<T> {
	pub fn new(inner: T) -> Self {
		Self { inner }
	}

	pub fn requires_reboot<F>(&self, other: &Self, f: F) -> bool
	where
		F: Fn(&T, &T) -> bool,
	{
		f(&self.inner, &other.inner)
	}
}

impl<T: SettingsData> Default for VersionedSettings<T> {
	fn default() -> Self {
		Self { inner: T::default() }
	}
}

/// Allows the settings update path reject an unsupported version before committing to flash.
pub trait VersionedReadable: Readable {
	fn is_supported_version(version: u32) -> bool;
}

impl<T: SettingsData> VersionedReadable for VersionedSettings<T> {
	fn is_supported_version(version: u32) -> bool {
		version == T::VERSION
	}
}

impl<T: SettingsData> Readable for VersionedSettings<T> {
	async fn read_from<R: ReadAsync>(reader: &mut R) -> Result<Self, &'static str> {
		let version = reader
			.read_u32()
			.await
			.ok_or("Could not read settings version")?;
		if version != T::VERSION {
			return Err("Unsupported settings version");
		}
		let inner = T::read_data(reader).await?;
		Ok(Self { inner })
	}
}

impl<T: SettingsData> Writeable for VersionedSettings<T> {
	async fn write_to<W: WriteAsync>(&self, writer: &mut W) -> Result<(), &'static str> {
		writer.write_u32(T::VERSION).await?;
		self.inner.write_data(writer).await
	}
}
