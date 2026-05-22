using Cardboard.Device;
using Cardboard.Services;
using Cardboard.Windows;
using DeviceTool;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddInitialization().AddDeviceServices().AddWindowsSerialPort().AddWindowsService();

using var host = builder.Build();

await host.Services.Initialize();

List<(string Name, IProfileBuilder Builder)> allProfiles =
[
	("cranky", new CrankyProfileBuilder()),
	("jake", new JakeProfileBuilder()),
];
var deviceService = host.Services.GetRequiredService<IDeviceService>();
var device = await SelectDevice(deviceService);

var filteredProfiles = device is null
	? allProfiles
	: allProfiles.Where(p => p.Builder.CanBuildFor(device.Type)).ToList();

var name = SelectName();

var (profileName, profile) = SelectProfile();

var settings = SelectSettings();

if (device == null)
{
	var fileName = Path.Combine(
		Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
		"_profile_temp.bin"
	);

	using var reader = new BinaryReader(new MemoryStream([0xFF]));
	var writerBuffer = new MemoryStream();
	await using var writer = new BinaryWriter(writerBuffer);
	var fakeCommandStream = new FakeCommandStream(reader, writer);
	var profileCommand = new UpdateProfileCommand();
	profileCommand.Execute(profile, fakeCommandStream);
	writer.Flush();

	var length = writerBuffer.Length;

	File.WriteAllBytes(fileName, writerBuffer.GetBuffer().AsSpan(0, (int)length));
	Console.WriteLine($"Wrote profile `{profileName}` ({length} bytes) to file `{fileName}`.");
	return;
}

Console.WriteLine($"Sending profile `{profileName}` to device `{device.Id}` with name `{name}`... ");

var profileResult = await deviceService.SendCommand(new UpdateProfileCommand(), profile, device.Id);
profileResult.Match(
	_ => Console.WriteLine("Profile sent successfully."),
	ex =>
	{
		Console.Write("Profile failed to send: ");
		Console.WriteLine(ex.Message);
	}
);

if (!profileResult.IsSuccess || settings == null)
	return;

Console.WriteLine($"Sending settings to device `{device.Id}`... ");

var settingsResult = await deviceService.SendCommand(new UpdateSettingsCommand(), settings, device.Id);
settingsResult.Match(
	_ => Console.WriteLine("Settings sent successfully."),
	ex =>
	{
		Console.Write("Settings failed to send: ");
		Console.WriteLine(ex.Message);
	}
);

return;

static async Task<DeviceInfo?> SelectDevice(IDeviceService deviceService)
{
	while (true)
	{
		Console.WriteLine("Select a device:");
		var devices = (await deviceService.GetDevices()).ToList();

		Console.WriteLine("0: To file");

		for (var i = 0; i < devices.Count; i++)
		{
			var device = devices[i];
			Console.WriteLine($"{i + 1}: {device.Id}");
		}

		Console.WriteLine();
		Console.Write("Enter device number: ");

		if (!TryReadIndex(out var index, devices.Count))
			continue;

		return index == -1 ? null : devices[index];
	}
}

string SelectName()
{
	Console.Write("Enter device name (optional, leave blank for default): ");
	var input = Console.ReadLine();
	return !string.IsNullOrWhiteSpace(input) ? input : "Cardboard Device";
}

(string ProfileName, DeviceProfile Profile) SelectProfile()
{
	while (true)
	{
		Console.WriteLine("Select a profile:");

		for (var i = 0; i < filteredProfiles.Count; i++)
			Console.WriteLine($"{i + 1}: {filteredProfiles[i].Name}");

		Console.WriteLine();
		Console.Write("Enter profile number: ");

		if (!TryReadIndex(out var index, filteredProfiles.Count))
			continue;

		var selected = filteredProfiles[index];
		var idGenerator = new IdGenerator(100000, 200000);
		return (selected.Name, selected.Builder.Build(name, idGenerator));
	}
}

DeviceSettings? SelectSettings()
{
	Console.Write("Enable mouse input? (y/n) leave blank for default: ");
	var input = Console.ReadLine();
	return !string.IsNullOrWhiteSpace(input)
		? DeviceSettings.CreateDefault() with
		{
			MouseEnabled = string.Equals(input, "y", StringComparison.OrdinalIgnoreCase),
		}
		: null;
}

static bool TryReadIndex(out int index, int count)
{
	var numberInput = Console.ReadLine();
	if (!int.TryParse(numberInput, out var number) || number < 0 || number > count)
	{
		Console.WriteLine("Invalid number.");
		Console.WriteLine();
		index = -1;
		return false;
	}

	index = number - 1;
	return true;
}

file class FakeCommandStream(BinaryReader reader, BinaryWriter writer) : ICommandStream
{
	public BinaryReader Reader => reader;
	public BinaryWriter Writer => writer;

	public void ClearReadBuffer() => throw new NotSupportedException();

	public void Dispose() => throw new NotSupportedException();
}
