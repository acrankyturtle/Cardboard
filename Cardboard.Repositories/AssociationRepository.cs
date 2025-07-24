using System.Drawing;
using System.Reactive;
using System.Reactive.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Device;
using Cardboard.Utilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StronglyTypedIds;

namespace Cardboard.Repositories;

public interface IAssociationRepository
{
	IObservable<Unit> OnAssociationsChanged { get; }

	Task<IReadOnlyCollection<ApplicationAssociation>> GetAssociations(
		ApplicationAssociationFilter filter = new(),
		CancellationToken cancellationToken = default
	);

	Task<ApplicationAssociationId> CreateAssociation(
		ApplicationAssociationData applicationAssociation,
		CancellationToken cancellationToken = default
	);

	Task<ApplicationAssociation?> GetAssociation(
		ApplicationAssociationId id,
		CancellationToken cancellationToken = default
	);

	Task<bool> UpdateAssociation(
		ApplicationAssociationId id,
		ApplicationAssociationData applicationAssociation,
		CancellationToken cancellationToken = default
	);

	Task<bool> DeleteAssociation(ApplicationAssociationId id, CancellationToken cancellationToken = default);

	// todo: remove/refactor
	Task<TagsInUseResult> GetTagsInUse(CancellationToken cancellationToken = default);

	Task<IReadOnlyCollection<ApplicationAssociation>> GetMatches(
		string path,
		CancellationToken cancellationToken = default
	);
}

public struct ApplicationAssociationFilter
{
	public IEnumerable<ApplicationAssociationId>? Ids { get; init; }
}

[StronglyTypedId]
public readonly partial struct ApplicationAssociationId;

public sealed class TagsInUseResult
{
	public required IReadOnlyCollection<LayerTag> TagsFromAssociations { get; init; }
	public required IReadOnlyCollection<LayerTag> TagsFromDevices { get; init; }
}

public record ApplicationAssociation
{
	public required ApplicationAssociationId Id { get; init; }
	public required ApplicationAssociationData Data { get; init; }
}

public record ApplicationAssociationData
{
	public required IReadOnlyCollection<LayerTag> Tags { get; init; }
	public required IReadOnlyCollection<VirtualKeyAssociation> VirtualKeys { get; init; } = [];
	public IReadOnlyCollection<string> MatchOnPath { get; init; } = [];
	public ApplicationIconEmblem? Emblem { get; init; }
}

public record VirtualKeyAssociation
{
	public required DeviceId DeviceId { get; init; }
	public required VirtualKeyDeviceMatch DeviceMatching { get; init; }
	public required int VirtualKey { get; init; }
}

public record VirtualKeyDeviceMatch
{
	public string? Vid { get; init; }
	public string? Pid { get; init; }
	public string? Serial { get; init; }
	public string? Description { get; init; }
	public required InputKey InputKey { get; init; }
}

public record ApplicationIconEmblem
{
	public ApplicationIconEmblemPosition Position { get; init; }
	public ApplicationIconEmblemShape Shape { get; init; }

	[JsonConverter(typeof(ColorJsonConverter))]
	public Color Color { get; init; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ApplicationIconEmblemPosition
{
	TopLeft,
	TopRight,
	BottomLeft,
	BottomRight,
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ApplicationIconEmblemShape
{
	Circle,
	Square,
	Triangle,
}

file class JsonAssociationRepository(
	IOptions<ApplicationRepositoryConfiguration> configuration,
	IDeviceService deviceService
) : IAssociationRepository, IDisposable
{
	private static readonly JsonSerializerOptions _serializerOptions = new()
	{
		WriteIndented = true,
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
	};

	private readonly FileWatcher _fileWatcher = new(configuration.Value.Path);
	public IObservable<Unit> OnAssociationsChanged => _fileWatcher.OnChanged.Select(_ => Unit.Default);

	public async Task<IReadOnlyCollection<ApplicationAssociation>> GetAssociations(
		ApplicationAssociationFilter filter,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);
		var associations = repository.Associations.AsEnumerable();

		if (filter.Ids is not null)
			associations = associations.Where(x => filter.Ids.Contains(x.Id));

		return associations.ToList();
	}

	public async Task<ApplicationAssociationId> CreateAssociation(
		ApplicationAssociationData applicationAssociation,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);

		var id = new ApplicationAssociationId(Guid.NewGuid());
		var association = new ApplicationAssociation { Id = id, Data = applicationAssociation };
		repository.Associations.Add(association);

		await Save(repository);
		return id;
	}

	public async Task<ApplicationAssociation?> GetAssociation(
		ApplicationAssociationId id,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);
		return repository.Associations.FirstOrDefault(x => x.Id == id);
	}

	public async Task<bool> UpdateAssociation(
		ApplicationAssociationId id,
		ApplicationAssociationData applicationAssociation,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);

		var index = repository.Associations.FindIndex(x => x.Id == id);
		if (index < 0)
			return false;

		repository.Associations[index] = repository.Associations[index] with
		{
			Data = applicationAssociation,
		};

		await Save(repository);
		return true;
	}

	public async Task<bool> DeleteAssociation(
		ApplicationAssociationId id,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);

		var index = repository.Associations.FindIndex(x => x.Id == id);
		if (index < 0)
			return false;

		repository.Associations.RemoveAt(index);

		await Save(repository);
		return true;
	}

	public async Task<TagsInUseResult> GetTagsInUse(CancellationToken cancellationToken = default)
	{
		var repository = await Open(cancellationToken);

		var tagsFromAssociations = repository.Associations.SelectMany(x => x.Data.Tags).Order().ToList();
		var tagsFromDevices = (await GetTagsInUseOnDevices(cancellationToken)).Order().ToList();

		return new() { TagsFromAssociations = tagsFromAssociations, TagsFromDevices = tagsFromDevices };
	}

	public async Task<IReadOnlyCollection<ApplicationAssociation>> GetMatches(
		string path,
		CancellationToken cancellationToken = default
	)
	{
		var repository = await Open(cancellationToken);
		return repository
			.Associations.Where(x =>
				x.Data.MatchOnPath.Any(y => path.Contains(y, StringComparison.OrdinalIgnoreCase))
			)
			.ToList();
	}

	public void Dispose()
	{
		_fileWatcher.Dispose();
	}

	private async Task<ApplicationRepositoryFile> Open(CancellationToken cancellationToken)
	{
		var path = configuration.Value.Path;

		if (!File.Exists(path))
			return new() { Associations = [] };

		// ReSharper disable once MethodHasAsyncOverloadWithCancellation
		var json = File.ReadAllText(path); // note: async version doesn't work during startup for some reason...
		return JsonSerializer.Deserialize<ApplicationRepositoryFile>(json, _serializerOptions)
			?? throw new JsonException();
	}

	private async Task Save(ApplicationRepositoryFile file)
	{
		var path = configuration.Value.Path;
		var directory = Path.GetDirectoryName(path)!;

		if (!Directory.Exists(directory))
			Directory.CreateDirectory(directory);

		var json = JsonSerializer.Serialize(file, _serializerOptions);
		await File.WriteAllTextAsync(path, json);
	}

	private async Task<IEnumerable<LayerTag>> GetTagsInUseOnDevices(CancellationToken cancellationToken)
	{
		var command = new GetProfileCommand();
		var results = await deviceService.SendCommand(command, new(), cancellationToken: cancellationToken);

		return results
			.Where(x => x.Result.IsSuccess)
			.SelectMany(x => x.Result.Assert().Keys.SelectMany(k => k.Layers.Layers.SelectMany(l => l.Tags)))
			.Distinct();
	}
}

file class ApplicationRepositoryFile
{
	public required List<ApplicationAssociation> Associations { get; init; }
}

public sealed class ApplicationRepositoryConfiguration
{
	public required string Associations { get; init; }

	public string Path => Environment.ExpandEnvironmentVariables(Associations);
}

public class ColorJsonConverter : JsonConverter<Color>
{
	public override Color Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
	{
		return ColorTranslator.FromHtml(reader.GetString() ?? throw new JsonException());
	}

	public override void Write(Utf8JsonWriter writer, Color value, JsonSerializerOptions options)
	{
		writer.WriteStringValue(
			"#" + value.R.ToString("X2") + value.G.ToString("X2") + value.B.ToString("X2").ToLower()
		);
	}
}

partial class Services
{
	private static IServiceCollection AddApplicationRepository(this IServiceCollection services)
	{
		// todo: configuration?
		return services.AddSingleton<IAssociationRepository, JsonAssociationRepository>();
	}
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InputKey
{
	None = 0,
	LeftButton = 0x01,
	RightButton = 0x02,

	//Cancel = 0x03,
	MiddleButton = 0x04,
	ExtraButton1 = 0x05,
	ExtraButton2 = 0x06,
	Back = 0x08,
	Tab = 0x09,

	//Clear = 0x0C,
	Return = 0x0D,
	Shift = 0x10,
	Control = 0x11,

	Menu = 0x12,

	Pause = 0x13,

	CapsLock = 0x14,

	//Kana = 0x15,

	//Hangeul = 0x15,

	//Hangul = 0x15,

	//Junja = 0x17,

	//Final = 0x18,

	//Hanja = 0x19,

	//Kanji = 0x19,

	Escape = 0x1B,

	//Convert = 0x1C,

	//NonConvert = 0x1D,

	//Accept = 0x1E,

	//ModeChange = 0x1F,

	Space = 0x20,

	Prior = 0x21,

	Next = 0x22,

	End = 0x23,

	Home = 0x24,

	Left = 0x25,

	Up = 0x26,

	Right = 0x27,

	Down = 0x28,

	//Select = 0x29,

	Print = 0x2A,

	//Execute = 0x2B,

	PrintScreen = 0x2C,

	Insert = 0x2D,

	Delete = 0x2E,

	//Help = 0x2F,

	N0 = 0x30,

	N1 = 0x31,

	N2 = 0x32,

	N3 = 0x33,

	N4 = 0x34,

	N5 = 0x35,

	N6 = 0x36,

	N7 = 0x37,

	N8 = 0x38,

	N9 = 0x39,

	A = 0x41,

	B = 0x42,

	C = 0x43,

	D = 0x44,

	E = 0x45,

	F = 0x46,

	G = 0x47,

	H = 0x48,

	I = 0x49,

	J = 0x4A,

	K = 0x4B,

	L = 0x4C,

	M = 0x4D,

	N = 0x4E,

	O = 0x4F,

	P = 0x50,

	Q = 0x51,

	R = 0x52,

	S = 0x53,

	T = 0x54,

	U = 0x55,

	V = 0x56,

	W = 0x57,

	X = 0x58,

	Y = 0x59,

	Z = 0x5A,

	LeftWindows = 0x5B,

	RightWindows = 0x5C,

	Application = 0x5D,

	//Sleep = 0x5F,

	Numpad0 = 0x60,

	Numpad1 = 0x61,

	Numpad2 = 0x62,

	Numpad3 = 0x63,

	Numpad4 = 0x64,

	Numpad5 = 0x65,

	Numpad6 = 0x66,

	Numpad7 = 0x67,

	Numpad8 = 0x68,

	Numpad9 = 0x69,

	Multiply = 0x6A,

	Add = 0x6B,

	//Separator = 0x6C,

	Subtract = 0x6D,

	Decimal = 0x6E,

	Divide = 0x6F,

	F1 = 0x70,

	F2 = 0x71,

	F3 = 0x72,

	F4 = 0x73,

	F5 = 0x74,

	F6 = 0x75,

	F7 = 0x76,

	F8 = 0x77,

	F9 = 0x78,

	F10 = 0x79,

	F11 = 0x7A,

	F12 = 0x7B,

	F13 = 0x7C,

	F14 = 0x7D,

	F15 = 0x7E,

	F16 = 0x7F,

	F17 = 0x80,

	F18 = 0x81,

	F19 = 0x82,

	F20 = 0x83,

	F21 = 0x84,

	F22 = 0x85,

	F23 = 0x86,

	F24 = 0x87,

	NumLock = 0x90,

	ScrollLock = 0x91,

	//NEC_Equal = 0x92,

	//Fujitsu_Jisho = 0x92,

	//Fujitsu_Masshou = 0x93,

	//Fujitsu_Touroku = 0x94,

	//Fujitsu_Loya = 0x95,

	//Fujitsu_Roya = 0x96,

	LeftShift = 0xA0,

	RightShift = 0xA1,

	LeftControl = 0xA2,

	RightControl = 0xA3,

	LeftAlt = 0xA4,

	RightAlt = 0xA5,

	//BrowserBack = 0xA6,

	//BrowserForward = 0xA7,

	//BrowserRefresh = 0xA8,

	//BrowserStop = 0xA9,

	//BrowserSearch = 0xAA,

	//BrowserFavorites = 0xAB,

	//BrowserHome = 0xAC,

	VolumeMute = 0xAD,

	VolumeDown = 0xAE,

	VolumeUp = 0xAF,

	MediaNextTrack = 0xB0,

	MediaPrevTrack = 0xB1,

	MediaStop = 0xB2,

	MediaPlayPause = 0xB3,

	//LaunchMail = 0xB4,

	//LaunchMediaSelect = 0xB5,

	//LaunchApplication1 = 0xB6,

	//LaunchApplication2 = 0xB7,

	OEM1 = 0xBA,

	OEMPlus = 0xBB,

	OEMComma = 0xBC,

	OEMMinus = 0xBD,

	OEMPeriod = 0xBE,

	OEM2 = 0xBF,

	OEM3 = 0xC0,

	OEM4 = 0xDB,

	OEM5 = 0xDC,

	OEM6 = 0xDD,

	OEM7 = 0xDE,

	OEM8 = 0xDF,

	//OEMAX = 0xE1,

	//OEM102 = 0xE2,

	//ICOHelp = 0xE3,

	//ICO00 = 0xE4,

	//ProcessKey = 0xE5,

	//ICOClear = 0xE6,

	//Packet = 0xE7,

	//OEMReset = 0xE9,

	//OEMJump = 0xEA,

	//OEMPA1 = 0xEB,

	//OEMPA2 = 0xEC,

	//OEMPA3 = 0xED,

	//OEMWSCtrl = 0xEE,

	//OEMCUSel = 0xEF,

	//OEMATTN = 0xF0,

	//OEMFinish = 0xF1,

	//OEMCopy = 0xF2,

	//OEMAuto = 0xF3,

	//OEMENLW = 0xF4,

	//OEMBackTab = 0xF5,

	//ATTN = 0xF6,

	//CRSel = 0xF7,

	//EXSel = 0xF8,

	//EREOF = 0xF9,

	//Play = 0xFA,

	//Zoom = 0xFB,

	//Noname = 0xFC,

	//PA1 = 0xFD,

	//OEMClear = 0xFE,

	ScrollUp = 255,
	ScrollDown = 256,
}
