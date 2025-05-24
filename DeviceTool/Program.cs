using System.Text.Json;
using System.Text.Json.Serialization;
using System.Windows.Forms;
using Cardboard.Device;
using Cardboard.Events;
using Cardboard.Events.Windows;
using Cardboard.Repositories;
using Cardboard.Serial.Windows;
using Cardboard.Windows;
using DeviceTool;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

// var deviceProfile = new DeviceProfile
// {
// 	Keys =
// 	[
// 		new()
// 		{
// 			Id = DeviceKeyId.Parse("0661ee85-348b-5d93-b5e2-ac11cfa5344b"),
// 			Layers =
// 			[
// 				new()
// 				{
// 					Layer = new()
// 					{
// 						Id = LayerId.Parse("d988067e-8d3a-5606-92b2-616e960d6157"),
// 						Macros = [MacroId.Parse("44c65d2b-2ef3-5843-b1d1-c2295600593b")],
// 					},
// 					Tags = [LayerTag.Parse("hi")],
// 					MatchType = TagMatchType.Any,
// 				},
// 			],
// 			DefaultLayer = new()
// 			{
// 				Id = LayerId.Parse("4019527f-fc18-5a66-83a8-8e1b4f5b5775"),
// 				Macros = [MacroId.Parse("50f04f39-e2ff-5bce-a4b7-9d234fcc5078")],
// 			},
// 		},
// 	],
// 	Macros =
// 	[
// 		new()
// 		{
// 			Id = MacroId.Parse("50f04f39-e2ff-5bce-a4b7-9d234fcc5078"),
// 			Name = "Test",
// 			CutChannels = [],
// 			StartSequence = new()
// 			{
// 				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.C } } }],
// 			},
// 			LoopSequence = new() { Actions = [] },
// 			EndSequence = new()
// 			{
// 				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.C } } }],
// 			},
// 		},
// 		new()
// 		{
// 			Id = MacroId.Parse("44c65d2b-2ef3-5843-b1d1-c2295600593b"),
// 			Name = "Tagged",
// 			CutChannels = [],
// 			StartSequence = new()
// 			{
// 				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.T } } }],
// 			},
// 			LoopSequence = new() { Actions = [] },
// 			EndSequence = new()
// 			{
// 				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.T } } }],
// 			},
// 		},
// 	],
// };

var deviceProfile = MyProfile.Value;

var apiJsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
	DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
	PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
};

apiJsonOptions.Converters.Add(new JsonStringEnumConverter());

var deviceJsonOptions = DeviceJson.SerializerOptions;

var apiJson = JsonSerializer.Serialize(deviceProfile, apiJsonOptions);
var deviceJson = JsonSerializer.Serialize(JsonDeviceProfile.From(deviceProfile), deviceJsonOptions);

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddDeviceServices().AddWindowsSerialPort().AddWindowsService();

using var host = builder.Build();

var deviceService = host.Services.GetRequiredService<IDeviceService>();

Console.WriteLine("Sending profile...");

var results = await deviceService.SendCommand(new ChangeProfileCommand(), deviceProfile);

Console.WriteLine("Results:");
foreach (var (deviceId, result) in results)
{
	Console.WriteLine($"{deviceId}: {result.Match(_ => "Success", ex => ex.Message)}");
}
