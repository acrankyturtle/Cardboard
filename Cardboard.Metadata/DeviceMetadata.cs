using System.Drawing;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cardboard.Device;

namespace Cardboard.Metadata;

public sealed record DeviceMetadata
{
	public required DeviceTypeId DeviceTypeId { get; init; }
	public required DeviceIdentityMetadata BaseIdentity { get; init; }
	public required IReadOnlyDictionary<string, DeviceVariantMetadata> Variants { get; init; }
	public required IReadOnlyDictionary<DeviceKeyId, KeyMetadata> KeyMap { get; init; }
}

public sealed record DeviceIdentityMetadata
{
	public required string Model { get; init; }
	public string? IconUrl { get; init; }
}

public sealed record DeviceVariantMetadata
{
	public required DeviceIdentityMetadata Identity { get; init; }

	public IReadOnlyDictionary<DeviceKeyId, KeyMetadata> AdditionalKeys { get; init; } =
		new Dictionary<DeviceKeyId, KeyMetadata>();

	public IReadOnlyDictionary<DeviceKeyId, KeyOverride> KeyOverrides { get; init; } =
		new Dictionary<DeviceKeyId, KeyOverride>();
}

public sealed record KeyMetadata
{
	public required string Name { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public required KeyOffset Offset { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public required KeySize Size { get; init; }

	public required KeyColor DefaultColor { get; init; }
}

public sealed record KeyOverride
{
	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public KeyOffset? Offset { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public KeySize? Size { get; init; }

	public KeyColor? DefaultColor { get; init; }
}

public sealed record KeyOffset
{
	[JsonIgnore(Condition = JsonIgnoreCondition.Never)]
	public required int X { get; init; }

	[JsonIgnore(Condition = JsonIgnoreCondition.Never)]
	public required int Y { get; init; }
}

public sealed record KeySize
{
	[JsonIgnore(Condition = JsonIgnoreCondition.Never)]
	public required int Width { get; init; }

	[JsonIgnore(Condition = JsonIgnoreCondition.Never)]
	public required int Height { get; init; }
}

public enum KeyColor
{
	Regular,
	Accent1,
	Accent2,
}

internal class ColorToHexStringConverter : JsonConverter<Color>
{
	public override Color Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
	{
		var hexStr = reader.GetString();
		if (string.IsNullOrEmpty(hexStr))
			return Color.Empty;

		var hex = hexStr.AsSpan();

		if (hex.StartsWith("#"))
			hex = hex[1..];

		return int.TryParse(hex, System.Globalization.NumberStyles.HexNumber, null, out var argb)
			? Color.FromArgb(argb)
			: throw new JsonException("Invalid color hex string.");
	}

	public override void Write(Utf8JsonWriter writer, Color value, JsonSerializerOptions options)
	{
		var hex = value.ToArgb().ToString("X8");
		writer.WriteStringValue($"#{hex}");
	}
}
