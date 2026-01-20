using Cardboard.Device;
using Cardboard.Services;
using Cardboard.Update;
using Cardboard.Windows;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var deviceId = DeviceId.Parse("8ff080b0-94cf-5ca9-b858-b26f51d205ca");
var firmwarePath = Path.Combine(Environment.CurrentDirectory, "firmware.uf2");
var firmwareBytes = File.ReadAllBytes(firmwarePath);
var firmware = new DeviceFirmware
{
	DeviceType = DeviceTypeId.Parse("0407db48-ca74-5783-9b11-489637b7c615"),
	Version = 0,
	Firmware = firmwareBytes,
};
var options = new FirmwareUpdateOptions { FlashOnly = false, MigrateProfile = true };

var builder = Host.CreateApplicationBuilder(args);

builder
	.Services.AddInitialization()
	.AddDeviceServices()
	.AddDeviceUpdater()
	.AddWindowsSerialPort()
	.AddWindowsService();

var app = builder.Build();

await app.Services.Initialize();

var updater = ActivatorUtilities.CreateInstance<Updater>(app.Services);
await updater.Execute(deviceId, firmware, options);

file class Updater(IDeviceUpdater updater, IHostApplicationLifetime lifetime, ILogger<Updater> logger)
{
	public async Task Execute(
		DeviceId deviceId,
		DeviceFirmware firmware,
		FirmwareUpdateOptions options,
		CancellationToken stoppingToken = default
	)
	{
		try
		{
			await updater.UpdateDevice(deviceId, firmware, options.MigrateProfile, stoppingToken);
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

	public async Task Execute(DeviceFirmware firmware, CancellationToken stoppingToken = default)
	{
		try
		{
			await updater.UpdateDevice(firmware, stoppingToken);
		}
		catch (Exception e)
		{
			logger.LogError(e, "Failed to update device");
			throw;
		}
		finally
		{
			lifetime.StopApplication();
		}
	}
}
