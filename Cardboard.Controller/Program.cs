using Cardboard.Api;
using Cardboard.Controller;
using Cardboard.Device;
using Cardboard.Events;
using Cardboard.FrontendHost;
using Cardboard.Repositories;
using Cardboard.Services;
using Cardboard.Update;
using Cardboard.Update.Api;
using Cardboard.Utilities;
using Cardboard.Windows;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;

var builder = WebApplication.CreateBuilder(args);

// add memory logger provider to capture logs for the API
builder.Logging.Services.AddSingleton<ILoggerProvider, MemoryLoggerProvider>();

builder.WebHost.ConfigureKestrel(options =>
{
	// TODO: configure connection limits?
});

// web api json options
builder.Services.ConfigureWebJsonOptions();

builder
	.Services.AddSwaggerGen(options =>
	{
		options.MapStronglyTypedId<Channel>();
		options.MapStronglyTypedId<CommandId>();
		options.MapStronglyTypedId<DeviceId>();
		options.MapStronglyTypedId<DeviceKeyId>();
		options.MapStronglyTypedId<DeviceTypeId>();
		options.MapStronglyTypedId<LayerId>();
		options.MapStronglyTypedId<LayerTag>();
		options.MapStronglyTypedId<MacroId>();
		options.MapStronglyTypedId<MacroIndex>();
		options.MapStronglyTypedId<ApplicationAssociationId>();
	})
	.AddEndpointsApiExplorer();

builder.Services.AddHttpClient();

var updateConfig = builder.Configuration.GetSection("Update");
var frontendConfig = builder.Configuration.GetSection("Frontend");
var pathsConfig = builder.Configuration.GetSection("Paths");
var cacheConfig = builder.Configuration.GetSection("Cache");

builder
	.Services.AddInitialization()
	.ConfigureCacheTimings(cacheConfig)
	.AddApiFirmwareSource(updateConfig)
	.AddApiMetadataSource(pathsConfig)
	.AddApiDeviceIconSource(pathsConfig)
	.AddBundledCacheSeeder()
	.AddApiControllerSource()
	.AddDeviceServices()
	.AddDeviceUpdater()
	.AddCardboardServices()
	.AddCardboardWindowsEvents()
	.AddFrontendHosting()
	.AddFrontendService(frontendConfig)
	.AddRepositories(pathsConfig)
	.AddTrayIcon()
	.AddWindowsSerialPort()
	.AddWindowsService();

if (builder.Environment.IsDevelopment())
{
	builder.Services.AddCors(options =>
	{
		options.AddPolicy(
			"AllowReactApp",
			policy =>
			{
				policy.WithOrigins("http://localhost:5173").AllowAnyMethod().AllowAnyHeader();
			}
		);
	});

	builder
		.Services.AddEventDebugger()
		.WithEvent(
			"Current Application",
			sp => sp.GetRequiredService<IApplicationEventService>().OnApplicationChanged.WeakIfLazy()
		)
		.WithEvent(
			"Active Associations",
			sp => sp.GetRequiredService<IAssociationEventService>().OnActiveAssociationChanged.WeakIfLazy()
		)
		.WithEvent("Devices", sp => sp.GetRequiredService<IDeviceService>().OnDevicesChanged.WeakIfLazy())
		//.WithEvent("Input", sp => sp.GetRequiredService<IInputEventService>().OnInput.WeakIfLazy())
	;
}

var app = builder.Build();

// Block requests from external origins (prevents malicious websites from accessing the API)
app.UseLocalOriginValidation();

if (app.Environment.IsDevelopment())
{
	app.UseSwagger();
	app.UseSwaggerUI(c =>
	{
		c.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
	});

	app.UseCors("AllowReactApp");
	app.UseStaticFiles();
}
else
{
	// In Release mode, serve the React SPA from wwwroot with SPA fallback routing
	app.UseSpaStaticFiles();
}

app.MapDeviceIcons();
app.MapFrontendApi();

app.Run();
