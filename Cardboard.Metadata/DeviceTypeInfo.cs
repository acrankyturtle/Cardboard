using Cardboard.Device;

namespace Cardboard.Metadata;

public sealed record DeviceTypeInfo
{
	public required DeviceTypeId Id { get; init; }
	public required string? Variant { get; init; }
	public required string Model { get; init; }
	public string? IconUrl { get; init; }
	public IReadOnlyCollection<KeyInfo> KeyMap { get; init; } = [];

	public static DeviceTypeInfo From(DeviceMetadata metadata, string? variant)
	{
		var variantMetadata =
			variant is not null && metadata.Variants.TryGetValue(variant, out var v) ? v : null;

		var keyMap = new List<KeyInfo>(metadata.KeyMap.Count + (variantMetadata?.AdditionalKeys.Count ?? 0));
		foreach (var (keyId, keyMetadata) in metadata.KeyMap)
		{
			var overrideMetadata = variantMetadata?.KeyOverrides.GetValueOrDefault(keyId);
			keyMap.Add(
				KeyInfo.From(
					keyId,
					keyMetadata,
					overrideMetadata is not null ? new[] { overrideMetadata } : Array.Empty<KeyOverride>()
				)
			);
		}

		if (variantMetadata != null)
		{
			foreach (var (keyId, keyMetadata) in variantMetadata.AdditionalKeys)
			{
				var overrideMetadata = variantMetadata.KeyOverrides.GetValueOrDefault(keyId);
				keyMap.Add(
					KeyInfo.From(
						keyId,
						keyMetadata,
						overrideMetadata is not null ? new[] { overrideMetadata } : Array.Empty<KeyOverride>()
					)
				);
			}
		}

		var identity = variantMetadata?.Identity ?? metadata.BaseIdentity;

		if (identity.IconUrl is null && metadata.BaseIdentity.IconUrl is not null)
		{
			// override icon url with base identity if variant doesn't specify one to ensure the device has an icon
			identity = identity with
			{
				IconUrl = metadata.BaseIdentity.IconUrl,
			};
		}

		return new()
		{
			Id = metadata.DeviceTypeId,
			Variant = variant,
			Model = identity.Model,
			IconUrl = identity.IconUrl,
			KeyMap = keyMap,
		};
	}
}

public sealed class KeyInfo
{
	public required DeviceKeyId KeyId { get; init; }

	public required string Name { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public required KeyOffset Offset { get; init; }

	/// <summary>
	/// 100 units = 1.0u key size
	/// </summary>
	public required KeySize Size { get; init; }

	public required KeyColor Color { get; init; }

	public static KeyInfo From(
		DeviceKeyId id,
		KeyMetadata metadata,
		IReadOnlyCollection<KeyOverride> overrides
	) =>
		new()
		{
			KeyId = id,
			Name = metadata.Name,
			Offset = overrides.FirstOrDefault(x => x.Offset is not null)?.Offset ?? metadata.Offset,
			Size = overrides.FirstOrDefault(x => x.Size is not null)?.Size ?? metadata.Size,
			Color =
				overrides.FirstOrDefault(x => x.DefaultColor is not null)?.DefaultColor
				?? metadata.DefaultColor,
		};
}
