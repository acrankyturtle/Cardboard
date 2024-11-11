use crate::{
	command::{CommandInfo, CommandList, DeviceId, DeviceInfo},
	context::ContextSerialPort,
	Error,
};

pub struct CommandInstance<Context> {
	pub info: CommandInfo,
	pub execute: fn(&mut Context) -> Result<(), Error>,
}

pub struct DeviceSetup<const C: usize, Context> {
	pub id: DeviceId,
	pub name: &'static str,
	pub manufacturer: &'static str,
	pub commands: [CommandInstance<Context>; C],
}

impl<'a, const C: usize, Context: ContextSerialPort<'a>> DeviceSetup<C, Context> {
	pub fn build(self) -> (DeviceInfo, CommandList<C, Context>) {
		(
			DeviceInfo {
				id: self.id,
				name: self.name,
				manufacturer: self.manufacturer,
				commands: self.commands.iter().map(|cmd| cmd.info).collect(),
			},
			CommandList::new(self.commands),
		)
	}
}
