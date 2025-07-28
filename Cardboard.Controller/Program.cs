using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Controller;
using Cardboard.Device;
using Cardboard.Events;
using Cardboard.HttpApi;
using Cardboard.Repositories;
using Cardboard.Services;
using Cardboard.Utilities;
using Cardboard.Windows;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Json;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
	// TODO: configure connection limits?
});

// todo: configure in TagRepository
builder.Services.Configure<ApplicationRepositoryConfiguration>(builder.Configuration.GetSection("Paths"));

// web api json options
builder.Services.Configure<JsonOptions>(options =>
{
	options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
	options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
	options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
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
		options.MapStronglyTypedId<ApplicationAssociationId>();
	})
	.AddEndpointsApiExplorer();

builder
	.Services.AddDeviceServices()
	.AddCardboardServices()
	.AddCardboardWindowsEvents()
	.AddRepositories()
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

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.MapFallbackToFile("index.html");

app.MapEndpoints();

app.Run();
