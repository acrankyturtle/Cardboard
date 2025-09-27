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

List<(string Name, DeviceProfile Profile)> profiles =
[
	("cranky", CrankyProfile.Profile),
	("jake", JakeProfile.Profile),
];

var (name, profile) = SelectProfile();

// var apiJsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
// {
// 	DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
// 	PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
// };
//
// apiJsonOptions.Converters.Add(new JsonStringEnumConverter());

// var deviceJsonOptions = DeviceJson.SerializerOptions;
// var apiJson = JsonSerializer.Serialize(profile, apiJsonOptions);
// var deviceJson = JsonSerializer.Serialize(JsonDeviceProfile.From(profile), deviceJsonOptions);

var deviceService = host.Services.GetRequiredService<IDeviceService>();

var device = await SelectDevice(deviceService);

Console.WriteLine($"Sending profile `{name}` to device `{device.Name}` ({device.Id})...");

var result = await deviceService.SendCommand(new ChangeProfileCommand(), profile, device.Id);
Console.WriteLine($"Result: {result.Match(_ => "Success", ex => ex.Message)}");

return;

(string Name, DeviceProfile Profile) SelectProfile()
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

		return profiles[index];
	}
}

static async Task<DeviceInfo> SelectDevice(IDeviceService deviceService)
{
	while (true)
	{
		Console.WriteLine("Select a device:");
		var devices = (await deviceService.GetDevices()).ToList();

		for (var i = 0; i < devices.Count; i++)
		{
			var device = devices[i];
			Console.WriteLine($"{i + 1}: {device.Name} ({device.Id})");
		}

		Console.WriteLine();
		Console.Write("Enter device number: ");

		if (!TryReadIndex(out var index, devices.Count))
			continue;

		return devices[index];
	}
}

static bool TryReadIndex(out int index, int count)
{
	var numberInput = Console.ReadLine();
	if (!int.TryParse(numberInput, out var number) || number < 1 || number > count)
	{
		Console.WriteLine("Invalid number.");
		Console.WriteLine();
		index = -1;
		return false;
	}

	index = number - 1;
	return true;
}
