using Cardboard.Device;
using Cardboard.Device.Modules.Keyboard;
using Cardboard.Serial;
using Cardboard.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);

// builder.Configuration.AddFileConfigurationOptions();

builder.Services.AddInitialization();
builder.Services.AddCardboardDeviceManager();
builder.Services.AddSystemSerialPort(builder.Configuration);
builder.Services.AddHostedService<App>();

var host = builder.Build();

await host.Services.Initialize();

host.Run();

internal class App(IDeviceManager deviceManager, IHost host) : BackgroundService
{
	protected override async Task ExecuteAsync(CancellationToken stoppingToken)
	{
		start:
		var shouldContinue = await RunCommand();
		if (shouldContinue)
		{
			Console.WriteLine(Environment.NewLine);
			goto start;
		}

		await host.StopAsync(stoppingToken);
	}

	/// <returns>Whether you should continue</returns>
	private async Task<bool> RunCommand()
	{
		Console.Write(
			"""
			Cardboard Serial Debugger

			### COMMANDS

			0: QUIT

			BASIC
			1: Identify

			- KEYBOARD
			2: Set Profile

			command=
			"""
		);

		if (int.TryParse(Console.ReadLine(), out var cmd))
		{
			switch (cmd)
			{
				case 0:
					return false;

				case 1:
					var devices = await deviceManager.GetDevices();
					Console.WriteLine($"Found {devices.Count} devices:");

					foreach (var device in devices)
					{
						Console.WriteLine(
							$"""
							ID={device.Id}
							Name={device.Name}
							Manufacturer={device.Manufacturer}
							Commands={string.Join(", ", device.Commands.Select(x => x.Name))}
							
							"""
						);
					}
					break;

				case 2:

					{
						var profile = new KeyboardProfile
						{
							Keys =
							[
								new()
								{
									Id = new(Guid.Parse("E8EC3732-62BC-452E-9ADF-6D5C2DD3A330")),
									DefaultLayer = new()
									{
										Id = new(Guid.Parse("E7D333EE-B7F4-42C7-8652-E0DBF603B20F")),
										Macros = [],
									},
									Layers = [],
								},
							],
						};

						var command = new SetKeyboardProfileCommand(profile);
						var result = await deviceManager.ExecuteCommand(command);

						foreach (var (deviceId, r) in result)
						{
							Console.WriteLine($"Device {deviceId}: {(r.IsSuccess ? "success" : "FAIL")}");
						}
					}
					break;

				case 3:

					{
						var command = new FakeCommand();
						var result = await deviceManager.ExecuteCommand(command);

						foreach (var (deviceId, r) in result)
						{
							Console.WriteLine($"Device {deviceId}: {(r.IsSuccess ? "success" : "FAIL")}");
						}
					}

					break;
			}
		}

		return true;
	}
}
