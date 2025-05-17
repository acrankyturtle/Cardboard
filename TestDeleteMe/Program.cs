using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Device;
using Cardboard.Events;
using Cardboard.Events.Windows;
using Cardboard.Serial.Windows;
using Cardboard.Windows;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var deviceProfile = new DeviceProfile
{
	Keys =
	[
		new()
		{
			Id = DeviceKeyId.Parse("0661ee85-348b-5d93-b5e2-ac11cfa5344b"),
			Layers =
			[
				new()
				{
					Layer = new()
					{
						Id = LayerId.Parse("d988067e-8d3a-5606-92b2-616e960d6157"),
						Macros = [MacroId.Parse("44c65d2b-2ef3-5843-b1d1-c2295600593b")],
					},
					Tags = [LayerTag.Parse("hi")],
					MatchType = TagMatchType.Any,
				},
			],
			DefaultLayer = new()
			{
				Id = LayerId.Parse("4019527f-fc18-5a66-83a8-8e1b4f5b5775"),
				Macros = [MacroId.Parse("50f04f39-e2ff-5bce-a4b7-9d234fcc5078")],
			},
		},
	],
	Macros =
	[
		new()
		{
			Id = MacroId.Parse("50f04f39-e2ff-5bce-a4b7-9d234fcc5078"),
			Name = "Test",
			CutChannels = [],
			StartSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.C } } }],
			},
			LoopSequence = new() { Actions = [] },
			EndSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.C } } }],
			},
		},
		new()
		{
			Id = MacroId.Parse("44c65d2b-2ef3-5843-b1d1-c2295600593b"),
			Name = "Tagged",
			CutChannels = [],
			StartSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.T } } }],
			},
			LoopSequence = new() { Actions = [] },
			EndSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.T } } }],
			},
		},
	],
};

var apiJsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
	DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault,
	PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
};
apiJsonOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));

var deviceJsonOptions = DeviceJson.SerializerOptions;

var apiJson = JsonSerializer.Serialize(deviceProfile, apiJsonOptions);
var deviceJson = JsonSerializer.Serialize(JsonDeviceProfile.From(deviceProfile), deviceJsonOptions);

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddDeviceServices().AddCardboardWindowsEvents().AddWindowsSerialPort().AddWindowsService();

using var host = builder.Build();

var provider = host.Services.GetRequiredService<IDeviceProvider>();

Console.WriteLine("Initial devices:");
await ListDevices();

using var devSub = provider
	.OnDevicesChanged
	.Subscribe(e =>
	{
		if (e.Added.Count > 0)
		{
			Console.WriteLine("Added devices:");
			foreach (var device in e.Added)
			{
				Console.WriteLine(device.Id);
			}
		}

		if (e.Removed.Count > 0)
		{
			Console.WriteLine("Removed devices:");
			foreach (var device in e.Removed)
			{
				Console.WriteLine(device.Id);
			}
		}
	});

var applicationEventService = host.Services.GetRequiredService<IApplicationEventService>();
using var appSub = applicationEventService
	.OnApplicationChanged
	.Subscribe(x => Console.WriteLine($"App changed: {x.Path}"));

await host.RunAsync();

async Task ListDevices()
{
	foreach (var device in await provider.GetDevices())
	{
		Console.WriteLine(device.Id);
	}

	Console.WriteLine();
}
