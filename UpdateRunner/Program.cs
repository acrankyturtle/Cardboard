using Cardboard.Device;
using Cardboard.Serial.Windows;
using Cardboard.Update;
using Cardboard.Windows;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var deviceId = DeviceId.Parse("e6609103-c366-7c23-e660-9103c3667c23");
var firmwarePath = Path.Combine(Environment.CurrentDirectory, "firmware.uf2");
var firmwareBytes = File.ReadAllBytes(firmwarePath);
var firmware = new DeviceFirmware
{
	DeviceType = DeviceTypeId.Parse("0407db48-ca74-5783-9b11-489637b7c615"),
	Version = 0,
	Firmware = firmwareBytes,
};
var options = new UpdateOptions() { FlashOnly = true };

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddDeviceServices().AddWindowsSerialPort().AddWindowsService().AddUpdateService();

var app = builder.Build();

var updater = ActivatorUtilities.CreateInstance<Updater>(app.Services);
await updater.ExecuteAsync(deviceId, firmware, options);

file class Updater(IDeviceUpdater updater, IHostApplicationLifetime lifetime, ILogger<Updater> logger)
{
	public async Task ExecuteAsync(
		DeviceId deviceId,
		DeviceFirmware firmware,
		UpdateOptions options,
		CancellationToken stoppingToken = default
	)
	{
		try
		{
			await updater.UpdateDeviceAsync(deviceId, firmware, options, stoppingToken);
		}
		catch (Exception e)
		{
			logger.LogError(e, "Failed to update device {DeviceId}", deviceId);
			throw;
		}
		finally
		{
			lifetime.StopApplication();
		}
	}
}
