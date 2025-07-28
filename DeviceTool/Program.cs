using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Device;
using Cardboard.Serial.Windows;
using Cardboard.Windows;
using DeviceTool;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var (name, deviceProfile) = args switch
{
	["jake"] => JakesProfile.Value,
	_ => MyProfile.Value,
};

var apiJsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
	DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
	PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
};

apiJsonOptions.Converters.Add(new JsonStringEnumConverter());

// var deviceJsonOptions = DeviceJson.SerializerOptions;
// var apiJson = JsonSerializer.Serialize(deviceProfile, apiJsonOptions);
// var deviceJson = JsonSerializer.Serialize(JsonDeviceProfile.From(deviceProfile), deviceJsonOptions);

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddDeviceServices().AddWindowsSerialPort().AddWindowsService();

using var host = builder.Build();

var deviceService = host.Services.GetRequiredService<IDeviceService>();

Console.WriteLine($"Sending profile `{name}`...");

var results = await deviceService.SendCommand(new ChangeProfileCommand(), deviceProfile);

Console.WriteLine("Results:");
foreach (var (deviceId, result) in results)
{
	Console.WriteLine($"{deviceId}: {result.Match(_ => "Success", ex => ex.Message)}");
}
