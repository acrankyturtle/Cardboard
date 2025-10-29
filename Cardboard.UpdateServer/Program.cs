using Cardboard.Update.Api;
using Cardboard.Utilities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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

var app = builder.Build();

app.UseCors();

var config = app.Services.GetRequiredService<IOptions<UpdateServerPathConfiguration>>().Value;

var firmwarePath = Path.GetFullPath(
	config.Firmware ?? Path.Combine(Environment.CurrentDirectory, "files", "firmware")
);
Directory.CreateDirectory(firmwarePath);

app.MapGet(
	"/firmware/{deviceTypeId}/latest",
	(string deviceTypeId, [FromQuery] string? variant = null, [FromQuery] string channel = "stable") =>
		FindFirmware(deviceTypeId, variant, null, ParseChannelQueryParam(channel)) is { } latest
			? Results.Redirect(
				QueryHelpers.AddQueryString(
					$"/firmware/{deviceTypeId}/{latest.Version}",
					new Dictionary<string, string?> { { "variant", variant }, { "channel", channel } }
				)
			)
			: Results.NotFound()
);

app.MapGet(
	"/firmware/{deviceTypeId}/{version}",
	(
		string deviceTypeId,
		uint version,
		[FromQuery] string? variant = null,
		[FromQuery] string channel = "stable"
	) =>
		FindFirmware(deviceTypeId, variant, version, ParseChannelQueryParam(channel)) is { } firmware
			? Results.Ok(
				new { firmware.Version, IsPreview = firmware.Channel.HasFlag(UpdateChannel.Preview) }
			)
			: Results.NotFound()
);

app.MapGet(
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
			if (ParseFileName(name) is not { } file)
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

static (uint Version, string? Variant, UpdateChannel Channel)? ParseFileName(ReadOnlySpan<char> fileNameNoExt)
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
}
