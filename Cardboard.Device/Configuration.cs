namespace Cardboard.Device;

public record ConfigurationContainer(IReadOnlyDictionary<string, DeviceConfiguration> Devices);

public record DeviceConfiguration(
	string DeviceType,
	string DeviceVersion,
	IReadOnlyDictionary<string, ModuleConfiguration> Modules
);

public record ModuleConfiguration(string Version, string Payload);
