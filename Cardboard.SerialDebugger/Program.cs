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
builder.Services.AddKeyboard();
builder.Services.AddHostedService<App>();

var host = builder.Build();

await host.Services.Initialize();

host.Run();

internal class App(IDeviceManager deviceManager, IKeyboardService keyboardService, IHost host)
	: BackgroundService
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
			2: Get Device Keys
			3: Get Device Profile
			4: Set Device Profile
			5: Set External Layer Tags
			6: Set Virtual Key State

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
			}
		}

		return true;
	}
}
