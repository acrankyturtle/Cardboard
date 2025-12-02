using System.Text.Json;
using Cardboard.Device;
using Cardboard.Services;
using Cardboard.Windows;
using DeviceTool;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddInitialization().AddDeviceServices().AddWindowsSerialPort().AddWindowsService();

using var host = builder.Build();

await host.Services.Initialize();

List<(string Name, IProfileBuilder Builder)> profiles =
[
	("cranky", new CrankyProfileBuilder()),
	("jake", new JakeProfileBuilder()),
];
var deviceService = host.Services.GetRequiredService<IDeviceService>();
var device = await SelectDevice(deviceService);

var name = SelectName();

var (profileName, profile) = SelectProfile();

using var reader = new BinaryReader(new MemoryStream([0xFF]));
var writerBuffer = new MemoryStream();
await using var writer = new BinaryWriter(writerBuffer);
var fakeCommandStream = new FakeCommandStream(reader, writer);
var cmd = new ChangeProfileCommand();
cmd.Execute(profile, fakeCommandStream);
writer.Flush();

var length = writerBuffer.Length;

if (device == null)
{
	var jsonOptions = host.Services.GetRequiredService<IOptions<JsonOptions>>();
	var serializerOptions = jsonOptions.Value.SerializerOptions;
	var json = JsonSerializer.Serialize(profile, serializerOptions);

	var fileName = Path.Combine(
		Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
		"_profile_temp.bin"
	);

	File.WriteAllBytes(fileName, writerBuffer.GetBuffer().AsSpan(0, (int)length));
	Console.WriteLine($"Wrote profile `{profileName}` ({length} bytes) to file `{fileName}`.");
	return;
}

Console.WriteLine(
	$"Sending profile `{profileName}` ({length} bytes) to device `{device.Name}` ({device.Id}) with name `{name}`..."
);

var result = await deviceService.SendCommand(new ChangeProfileCommand(), profile, device.Id);
Console.WriteLine($"Result: {result.Match(_ => "Success", ex => ex.Message)}");

return;

(string ProfileName, DeviceProfile Profile) SelectProfile()
{
	while (true)
	{
		Console.WriteLine("Select a profile:");

		for (var i = 0; i < profiles.Count; i++)
			Console.WriteLine($"{i + 1}: {profiles[i].Name}");

		Console.WriteLine();
		Console.Write("Enter profile number: ");

		if (!TryReadIndex(out var index, profiles.Count))
			continue;

		var selected = profiles[index];
		var idGenerator = new IdGenerator(100000, 200000);
		return (selected.Name, selected.Builder.Build(device?.Id ?? DeviceId.Empty, name, idGenerator));
	}
}

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
			Console.WriteLine($"{i + 1}: {device.Name} ({device.Id})");
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
