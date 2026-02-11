using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Api;
using Cardboard.Device;
using Cardboard.Metadata;
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
		// Default: allow localhost origins for development
		policy.SetIsOriginAllowed(origin =>
		{
			var uri = new Uri(origin);
			return uri.IsLoopback;
		});

		// Only allow GET requests since this is a read-only file server
		policy.WithMethods("GET", "HEAD", "OPTIONS");
		policy.AllowAnyHeader();
	});
});

// web api json options
builder.Services.ConfigureWebJsonOptions();

builder.Services.Configure<UpdateServerPathConfiguration>(builder.Configuration.GetSection("Paths"));

builder.Services.AddSwaggerGen().AddEndpointsApiExplorer();

var app = builder.Build();

app.UseCors();

var config = app.Services.GetRequiredService<IOptions<UpdateServerPathConfiguration>>().Value;

var firmwarePath = Path.GetFullPath(config.Firmware);
Directory.CreateDirectory(firmwarePath);

var controllerPath = Path.GetFullPath(config.Controller);
Directory.CreateDirectory(controllerPath);

var metadataPath = Path.GetFullPath(config.Metadata);
Directory.CreateDirectory(metadataPath);

var deviceIconsPath = Path.GetFullPath(config.DeviceIcons);
Directory.CreateDirectory(deviceIconsPath);

var fileJsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
fileJsonOptions.Converters.Add(new JsonStringEnumConverter());

var apiRoot = builder.Configuration.GetValue<string?>("ApiPath")?.Trim('/');

IEndpointRouteBuilder group = apiRoot is not null ? app.MapGroup(apiRoot) : app;

group.MapGet(
	"/firmware",
	([FromQuery] string channel = "stable") =>
		new FirmwareListResponse
		{
			Entries = GetLatest(ParseChannelQueryParam(channel))
				.Select(x => new FirmwareListEntry
				{
					DeviceTypeId = x.DeviceTypeId.ToString(),
					Variant = x.Variant,
					LatestVersion = x.LatestVersion,
				})
				.ToList(),
		}
);

group.MapGet(
	"/firmware/{deviceTypeId}/latest",
	(string deviceTypeId, [FromQuery] string? variant = null, [FromQuery] string channel = "stable") =>
		FindFirmware(deviceTypeId, variant, null, ParseChannelQueryParam(channel)) is { } latest
			? Results.Redirect(
				QueryHelpers.AddQueryString(
					BuildRedirectPath($"/firmware/{deviceTypeId}/{latest.Version.ToString()}"),
					new Dictionary<string, string?> { { "variant", variant }, { "channel", channel } }
				)
			)
			: Results.NotFound()
);

group.MapGet(
	"/firmware/{deviceTypeId}/{version}",
	(
		string deviceTypeId,
		string version,
		[FromQuery] string? variant = null,
		[FromQuery] string channel = "stable"
	) =>
	{
		// Validate version format
		if (!Version.TryParse(version, out _))
			return Results.BadRequest("Invalid version format. Expected format: major.minor.patch");

		return FindFirmware(deviceTypeId, variant, version, ParseChannelQueryParam(channel)) is { } firmware
			? Results.Ok(
				new FirmwareVersionResponse
				{
					Version = firmware.Version,
					IsPreview = firmware.Channel.HasFlag(UpdateChannel.Preview),
					Sha256 = firmware.Sha256,
				}
			)
			: Results.NotFound();
	}
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
		string? version;

		if (versionStr.Equals("latest", StringComparison.OrdinalIgnoreCase))
		{
			version = null;
		}
		else
		{
			// Validate version format
			if (!Version.TryParse(versionStr, out _))
				return Results.BadRequest("Invalid version format. Expected format: major.minor.patch");

			version = versionStr;
		}

		var firmware = FindFirmware(deviceTypeId, variant, version, ParseChannelQueryParam(channel));

		if (firmware == null)
			return Results.NotFound();

		return Results.File(
			firmware.LocalPath,
			"application/octet-stream",
			$"cardboard_{deviceTypeId}_{firmware.Version.ToString()}.uf2"
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
					BuildRedirectPath($"/controller/{latest.Version.ToString()}"),
					new Dictionary<string, string?> { { "channel", channel } }
				)
			)
			: Results.NotFound()
);

group.MapGet(
	"/controller/{version}",
	(string version, [FromQuery] string channel = "stable") =>
	{
		// Validate version format (must be valid semantic version)
		if (!Version.TryParse(version, out _))
			return Results.BadRequest("Invalid version format. Expected format: major.minor.patch");

		return FindControllerRelease(version, ParseChannelQueryParam(channel)) is { } release
			? Results.Ok(
				new ControllerVersionResponse
				{
					Version = release.Version,
					IsPreview = release.Channel.HasFlag(UpdateChannel.Preview),
					Sha256 = release.Sha256,
				}
			)
			: Results.NotFound();
	}
);

group.MapGet(
	"/controller/{versionStr}/download",
	(string versionStr, [FromQuery] string channel = "stable") =>
	{
		string? version;
		if (versionStr.Equals("latest", StringComparison.OrdinalIgnoreCase))
		{
			version = null;
		}
		else
		{
			// Validate version format
			if (!Version.TryParse(versionStr, out _))
				return Results.BadRequest("Invalid version format. Expected format: major.minor.patch");
			version = versionStr;
		}

		var release = FindControllerRelease(version, ParseChannelQueryParam(channel));

		if (release == null)
			return Results.NotFound();

		return Results.File(
			release.LocalPath,
			"application/octet-stream",
			$"CardboardSetup-{release.Version.ToString()}.exe"
		);
	}
);

// Metadata endpoints
group.MapGet(
	"/metadata",
	(ILogger<Program> logger) =>
	{
		var entries = Directory
			.EnumerateFiles(metadataPath, "*.json")
			.SelectNotNull(path =>
			{
				try
				{
					var json = File.ReadAllText(path);
					var metadata = JsonSerializer.Deserialize<DeviceMetadata>(json, fileJsonOptions);
					if (metadata is null)
						return null;

					return new MetadataListEntry
					{
						DeviceTypeId = metadata.DeviceTypeId,
						Model = metadata.BaseIdentity.Model,
						Variants = metadata.Variants.Keys.ToList(),
					};
				}
				catch (Exception ex)
				{
					logger.LogWarning(ex, "Failed to read or parse metadata file {Path}", path);
					return null;
				}
			})
			.ToList();

		return new MetadataListResponse { Entries = entries };
	}
);

group.MapGet(
	"/metadata/{deviceTypeId}",
	async (string deviceTypeId) =>
	{
		// Validate deviceTypeId is a valid GUID
		if (!Guid.TryParse(deviceTypeId, out _))
			return Results.BadRequest("Invalid device type ID format");

		var filePath = Path.Combine(metadataPath, $"{deviceTypeId}.json");

		string json;

		try
		{
			json = await File.ReadAllTextAsync(filePath);
		}
		catch (FileNotFoundException)
		{
			return Results.NotFound();
		}

		var metadata = JsonSerializer.Deserialize<DeviceMetadata>(json, fileJsonOptions);
		return Results.Ok(new DeviceMetadataResponse { Metadata = metadata ?? throw new JsonException() });
	}
);

// Device icon endpoints
group.MapGet(
	"/device-icons/{fileName}",
	(string fileName) =>
	{
		var sanitized = Path.GetFileName(fileName);
		var filePath = Path.Combine(deviceIconsPath, sanitized);

		if (!File.Exists(filePath))
			return Results.NotFound();

		var contentType = Path.GetExtension(sanitized).ToLowerInvariant() switch
		{
			".svg" => "image/svg+xml",
			".png" => "image/png",
			_ => "application/octet-stream",
		};

		return Results.File(filePath, contentType);
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

// Builds a redirect path, handling the case where apiRoot may be null.
// Note: apiRoot is already trimmed of slashes and path should start with '/'.
string BuildRedirectPath(string path) => string.IsNullOrEmpty(apiRoot) ? path : $"/{apiRoot}{path}";

IEnumerable<(DeviceTypeId DeviceTypeId, string? Variant, Version LatestVersion)> GetLatest(
	UpdateChannel channel
)
{
	return Directory
		.EnumerateDirectories(firmwarePath)
		.SelectNotNull(
			(DeviceTypeId Id, string Path)? (path) =>
				DeviceTypeId.TryParse(Path.GetFileName(path), null, out var id) ? (id, path) : null
		)
		.SelectMany(x =>
			Directory
				.EnumerateFiles(x.Path)
				.SelectNotNull(p => ParseFirmwareFileName(Path.GetFileNameWithoutExtension(p)))
				.Where(f => channel.HasFlag(f.Channel))
				.Select(f => (x.Id, f.Variant, f.Version))
		)
		.GroupBy(x => (x.Id, x.Variant))
		.Select(g => g.MaxBy(x => x.Version));
}

FirmwareFileInfo? FindFirmware(string deviceTypeId, string? variant, string? version, UpdateChannel channel)
{
	// validate deviceTypeId is a valid GUID
	if (!Guid.TryParse(deviceTypeId, out _))
		return null;

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
				file.Channel,
				FileHasher.ComputeSha256(path)
			);
		});

	if (version != null && Version.TryParse(version, out var parsedVersion))
		files = files.Where(f => f.Version == parsedVersion);

	var list = files.OrderByDescending(x => x.Version).ToList();

	return list.FirstOrDefault(f => string.Equals(variant, f.Variant, StringComparison.OrdinalIgnoreCase));
}

static (Version Version, string? Variant, UpdateChannel Channel)? ParseFirmwareFileName(
	ReadOnlySpan<char> fileNameNoExt
)
{
	// Expected format: {major}-{minor}-{patch}[_{variant}][.p]
	// Examples: 0-0-1, 0-0-1_rev1, 0-0-1.p, 0-0-1_rev1.p
	var underscoreIndex = fileNameNoExt.IndexOf('_');
	var periodIndex = fileNameNoExt.IndexOf('.');

	var versionRange = new Range(
		0,
		underscoreIndex > 0 ? underscoreIndex
			: periodIndex > 0 ? periodIndex
			: fileNameNoExt.Length
	);
	var variantRange =
		underscoreIndex > 0
			? new Range(underscoreIndex + 1, periodIndex > 0 ? periodIndex : fileNameNoExt.Length)
			: (Range?)null;

	var versionStrRaw = fileNameNoExt[versionRange];
	Span<char> versionStr = stackalloc char[versionStrRaw.Length];
	versionStrRaw.Replace(versionStr, '-', '.');
	if (!Version.TryParse(versionStr, out var version))
		return null;

	var variant = variantRange is not null ? fileNameNoExt[variantRange.Value].ToString() : null;

	var isPreview = fileNameNoExt.EndsWith(".p", StringComparison.InvariantCultureIgnoreCase);
	var channel = isPreview ? UpdateChannel.Preview : UpdateChannel.Stable;

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

			return new ControllerFileInfo(
				name.ToString(),
				path,
				file.Version,
				file.Channel,
				FileHasher.ComputeSha256(path)
			);
		});

	if (version is not null && Version.TryParse(version, out var parsedVersion))
		files = files.Where(f => f.Version == parsedVersion);

	return files.OrderByDescending(x => x.Version).FirstOrDefault();
}

static (Version Version, UpdateChannel Channel)? ParseControllerFileName(ReadOnlySpan<char> fileNameNoExt)
{
	// Expected format: {major}-{minor}-{patch}[.p]
	// Examples: 1-0-0, 1-2-3.p
	var isPreview = fileNameNoExt.EndsWith(".p", StringComparison.OrdinalIgnoreCase);
	var versionSpan = isPreview ? fileNameNoExt[..^2] : fileNameNoExt;

	Span<char> versionStr = stackalloc char[versionSpan.Length];
	versionSpan.Replace(versionStr, '-', '.');
	if (!Version.TryParse(versionStr, out var version))
		return null;

	return (version, isPreview ? UpdateChannel.Preview : UpdateChannel.Stable);
}

file record ControllerFileInfo(
	string Name,
	string LocalPath,
	Version Version,
	UpdateChannel Channel,
	string Sha256
);

file record FirmwareFileInfo(
	string Name,
	string DeviceTypeId,
	string? Variant,
	string LocalPath,
	Version Version,
	UpdateChannel Channel,
	string Sha256
);

file static class FileHasher
{
	public static string ComputeSha256(string filePath)
	{
		using var stream = File.OpenRead(filePath);
		var hashBytes = SHA256.HashData(stream);
		return Convert.ToHexString(hashBytes).ToLowerInvariant();
	}
}

file class UpdateServerPathConfiguration
{
	public string Firmware { get; init; } = Path.Combine(Environment.CurrentDirectory, "files", "firmware");

	public string Controller { get; init; } =
		Path.Combine(Environment.CurrentDirectory, "files", "controller");

	public string Metadata { get; init; } = Path.Combine(Environment.CurrentDirectory, "files", "metadata");

	public string DeviceIcons { get; init; } =
		Path.Combine(Environment.CurrentDirectory, "files", "device-icons");
}
