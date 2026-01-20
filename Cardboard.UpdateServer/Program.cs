using Cardboard.Update.Api;
using Cardboard.Update.Api.Abstractions;
using Cardboard.Utilities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
	options.AddDefaultPolicy(policy =>
	{
		policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
	});
});

builder.Services.Configure<UpdateServerPathConfiguration>(builder.Configuration.GetSection("Paths"));

builder.Services.AddSwaggerGen().AddEndpointsApiExplorer();

var app = builder.Build();

app.UseCors();

var config = app.Services.GetRequiredService<IOptions<UpdateServerPathConfiguration>>().Value;

var firmwarePath = Path.GetFullPath(
	config.Firmware ?? Path.Combine(Environment.CurrentDirectory, "files", "firmware")
);
Directory.CreateDirectory(firmwarePath);

var controllerPath = Path.GetFullPath(
	config.Controller ?? Path.Combine(Environment.CurrentDirectory, "files", "controller")
);
Directory.CreateDirectory(controllerPath);

var apiRoot = builder.Configuration.GetValue<string?>("ApiPath")?.Trim('/');

IEndpointRouteBuilder group = apiRoot is not null ? app.MapGroup(apiRoot) : app;
group.MapGet(
	"/firmware/{deviceTypeId}/latest",
	(string deviceTypeId, [FromQuery] string? variant = null, [FromQuery] string channel = "stable") =>
		FindFirmware(deviceTypeId, variant, null, ParseChannelQueryParam(channel)) is { } latest
			? Results.Redirect(
				QueryHelpers.AddQueryString(
					$"/{apiRoot}/firmware/{deviceTypeId}/{latest.Version}",
					new Dictionary<string, string?> { { "variant", variant }, { "channel", channel } }
				)
			)
			: Results.NotFound()
);

group.MapGet(
	"/firmware/{deviceTypeId}/{version}",
	(
		string deviceTypeId,
		uint version,
		[FromQuery] string? variant = null,
		[FromQuery] string channel = "stable"
	) =>
		FindFirmware(deviceTypeId, variant, version, ParseChannelQueryParam(channel)) is { } firmware
			? Results.Ok(
				new FirmwareVersionResponse
				{
					Version = firmware.Version,
					IsPreview = firmware.Channel.HasFlag(UpdateChannel.Preview),
				}
			)
			: Results.NotFound()
);

group.MapGet(
	"/firmware/{deviceTypeId}/{versionStr}/download",
	(
		string deviceTypeId,
		string versionStr,
		[FromQuery] string? variant = null,
		[FromQuery] string channel = "stable"
	) =>
	{
		uint? version;

		if (versionStr.Equals("latest", StringComparison.OrdinalIgnoreCase))
		{
			version = null;
		}
		else
		{
			if (!uint.TryParse(versionStr, out var v))
				return TypedResults.BadRequest();

			version = v;
		}

		var firmware = FindFirmware(deviceTypeId, variant, version, ParseChannelQueryParam(channel));

		if (firmware == null)
			return TypedResults.NotFound();

		return Results.File(
			firmware.LocalPath,
			"application/octet-stream",
			$"cardboard_{deviceTypeId}_{firmware.Version}.uf2"
		);
	}
);

// Controller update endpoints
group.MapGet(
	"/controller/latest",
	([FromQuery] string channel = "stable") =>
		FindControllerRelease(null, ParseChannelQueryParam(channel)) is { } latest
			? Results.Redirect(
				QueryHelpers.AddQueryString(
					$"/{apiRoot}/controller/{latest.Version}",
					new Dictionary<string, string?> { { "channel", channel } }
				)
			)
			: Results.NotFound()
);

group.MapGet(
	"/controller/{version}",
	(string version, [FromQuery] string channel = "stable") =>
		FindControllerRelease(version, ParseChannelQueryParam(channel)) is { } release
			? Results.Ok(
				new ControllerVersionResponse
				{
					Version = release.Version,
					IsPreview = release.Channel.HasFlag(UpdateChannel.Preview),
				}
			)
			: Results.NotFound()
);

group.MapGet(
	"/controller/{versionStr}/download",
	(string versionStr, [FromQuery] string channel = "stable") =>
	{
		var version = versionStr.Equals("latest", StringComparison.OrdinalIgnoreCase) ? null : versionStr;

		var release = FindControllerRelease(version, ParseChannelQueryParam(channel));

		if (release == null)
			return TypedResults.NotFound();

		return Results.File(
			release.LocalPath,
			"application/octet-stream",
			$"CardboardSetup-{release.Version}.exe"
		);
	}
);

if (app.Environment.IsDevelopment())
{
	app.UseSwagger();
	app.UseSwaggerUI(c =>
	{
		c.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
	});
}

app.Run();
return;

UpdateChannel ParseChannelQueryParam(string channel) =>
	channel.Equals("preview", StringComparison.OrdinalIgnoreCase) ? UpdateChannel.All : UpdateChannel.Stable;

FirmwareFileInfo? FindFirmware(string deviceTypeId, string? variant, uint? version, UpdateChannel channel)
{
	var filePath = Path.Combine(firmwarePath, deviceTypeId);

	if (!Directory.Exists(filePath))
		return null;

	var files = Directory
		.GetFiles(filePath)
		.SelectNotNull(path =>
		{
			var name = Path.GetFileNameWithoutExtension(path.AsSpan());
			if (ParseFirmwareFileName(name) is not { } file)
				return null;

			if (!channel.HasFlag(file.Channel))
				return null;

			return new FirmwareFileInfo(
				name.ToString(),
				deviceTypeId,
				file.Variant,
				path,
				file.Version,
				file.Channel
			);
		});

	if (version is { } v)
		files = files.Where(f => f.Version == v);

	var list = files.OrderByDescending(x => x.Version).ToList();

	return list.FirstOrDefault(f => string.Equals(variant, f.Variant, StringComparison.OrdinalIgnoreCase))
		?? (variant is not null ? list.FirstOrDefault(f => f.Variant is null) : null);
}

static (uint Version, string? Variant, UpdateChannel Channel)? ParseFirmwareFileName(
	ReadOnlySpan<char> fileNameNoExt
)
{
	Span<Range> regions = stackalloc Range[3];
	var num = fileNameNoExt.Split(regions, '.');

	var versionStr = fileNameNoExt[regions[0]];
	var variantStr = num >= 2 ? fileNameNoExt[regions[1]] : [];
	var channelStr = num >= 2 ? fileNameNoExt[regions[2]] : [];

	if (!uint.TryParse(versionStr, out var version))
		return null;

	var variant = variantStr.Length > 0 ? variantStr.ToString() : null;

	var channel = channelStr.Equals("p", StringComparison.OrdinalIgnoreCase)
		? UpdateChannel.Preview
		: UpdateChannel.Stable;

	return (version, variant, channel);
}

ControllerFileInfo? FindControllerRelease(string? version, UpdateChannel channel)
{
	if (!Directory.Exists(controllerPath))
		return null;

	var files = Directory
		.GetFiles(controllerPath, "*.exe")
		.SelectNotNull(path =>
		{
			var name = Path.GetFileNameWithoutExtension(path.AsSpan());
			if (ParseControllerFileName(name) is not { } file)
				return null;

			if (!channel.HasFlag(file.Channel))
				return null;

			return new ControllerFileInfo(name.ToString(), path, file.Version, file.Channel);
		});

	if (version is not null)
		files = files.Where(f => f.Version.Equals(version, StringComparison.OrdinalIgnoreCase));

	return files
		.OrderByDescending(x => Version.TryParse(x.Version, out var v) ? v : new Version(0, 0, 0))
		.FirstOrDefault();
}

static (string Version, UpdateChannel Channel)? ParseControllerFileName(ReadOnlySpan<char> fileNameNoExt)
{
	// Expected format: {major}.{minor}.{patch}[.p]
	// Examples: 1.0.0, 1.2.3.p
	var isPreview = fileNameNoExt.EndsWith(".p", StringComparison.OrdinalIgnoreCase);
	var versionSpan = isPreview ? fileNameNoExt[..^2] : fileNameNoExt;

	if (!Version.TryParse(versionSpan, out _))
		return null;

	return (versionSpan.ToString(), isPreview ? UpdateChannel.Preview : UpdateChannel.Stable);
}

file record ControllerFileInfo(string Name, string LocalPath, string Version, UpdateChannel Channel);

file record FirmwareFileInfo(
	string Name,
	string DeviceTypeId,
	string? Variant,
	string LocalPath,
	uint Version,
	UpdateChannel Channel
);

file class UpdateServerPathConfiguration
{
	public string? Firmware { get; init; }
	public string? Controller { get; init; }
}
