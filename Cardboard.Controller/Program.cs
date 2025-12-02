using System.Text.Json;
using System.Text.Json.Serialization;
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
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
	// TODO: configure connection limits?
});

// web api json options
builder.Services.Configure<JsonOptions>(options =>
{
	options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
	options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
	options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// register json serializer options as singleton for our schema repository
builder.Services.AddSingleton<JsonSerializerOptions>(serviceProvider =>
{
	var jsonOptions = serviceProvider.GetRequiredService<IOptions<JsonOptions>>();
	return jsonOptions.Value.SerializerOptions;
});

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
		options.MapStronglyTypedId<SchemaName>();
	})
	.AddEndpointsApiExplorer();

builder.Services.AddHttpClient();

var updateConfig = builder.Configuration.GetSection("Update");
var frontendConfig = builder.Configuration.GetSection("Frontend");
var pathsConfig = builder.Configuration.GetSection("Paths");

builder
	.Services.AddInitialization()
	.AddApiFirmwareSource(updateConfig)
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

if (app.Environment.IsDevelopment())
{
	app.UseSwagger();
	app.UseSwaggerUI(c =>
	{
		c.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
	});

	app.UseCors("AllowReactApp");
}

// app.UseHttpsRedirection();
app.UseStaticFiles();

app.MapFrontendApi();

app.Run();
