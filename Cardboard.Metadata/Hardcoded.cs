using Cardboard.Device;

namespace Cardboard.Metadata;

public static class Hardcoded
{
	public static DeviceMetadata? GetDeviceMetadata(DeviceTypeId deviceTypeId) =>
		_metadata.FirstOrDefault(m => m.DeviceTypeId == deviceTypeId);

	private static DeviceMetadata Ck130 { get; } =
		new()
		{
			DeviceTypeId = DeviceTypeId.Parse("0407db48-ca74-5783-9b11-489637b7c615"),
			BaseIdentity = new() { Model = "CK1-30", IconUrl = "/device-icons/ck1-30.svg" },
			Variants = new Dictionary<string, DeviceVariantMetadata>
			{
				{
					"BLK",
					new() { Identity = new() { Model = "CK1-30 BLK" } }
				},
				{
					"WHT",
					new() { Identity = new() { Model = "CK1-30 WHT" } }
				},
			},
			KeyMap = new Dictionary<DeviceKeyId, KeyMetadata>
			{
				{
					DeviceKeyId.Parse("0661ee85-348b-5d93-b5e2-ac11cfa5344b"),
					new()
					{
						Name = "K-1",
						Offset = new() { X = -200, Y = -100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent1,
					}
				},
				{
					DeviceKeyId.Parse("87c4fd79-143b-576b-afa2-bea59e4cd02c"),
					new()
					{
						Name = "K-2",
						Offset = new() { X = -100, Y = -100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("1d652794-96a4-5c59-9948-afd441289317"),
					new()
					{
						Name = "K-3",
						Offset = new() { X = 0, Y = -100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("de57737c-e6c1-5818-bf94-d126ff5304a3"),
					new()
					{
						Name = "K-4",
						Offset = new() { X = 100, Y = -100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("85c20588-8148-5785-9e9f-44976e8dfef8"),
					new()
					{
						Name = "K-5",
						Offset = new() { X = 200, Y = -100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("b6ee974a-b405-5367-8c9f-e70a75045c37"),
					new()
					{
						Name = "K-6",
						Offset = new() { X = 300, Y = -100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent2,
					}
				},
				{
					DeviceKeyId.Parse("8a1052be-8165-5976-849b-511ce92f9956"),
					new()
					{
						Name = "K-7",
						Offset = new() { X = -200, Y = 0 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("91206d06-70d4-5b75-9fdf-aad7f367fff5"),
					new()
					{
						Name = "K-8",
						Offset = new() { X = -100, Y = 0 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("7abd3edf-f94c-522e-b2be-06a88bdb1cc9"),
					new()
					{
						Name = "K-9",
						Offset = new() { X = 0, Y = 0 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent1,
					}
				},
				{
					DeviceKeyId.Parse("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4"),
					new()
					{
						Name = "K-10",
						Offset = new() { X = 100, Y = 0 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("3a801a21-1ef7-5803-bf42-ecd1e8444656"),
					new()
					{
						Name = "K-11",
						Offset = new() { X = 200, Y = 0 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("c54ec31f-2381-5636-b0a5-edd448294b88"),
					new()
					{
						Name = "K-12",
						Offset = new() { X = 300, Y = 0 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent2,
					}
				},
				{
					DeviceKeyId.Parse("16ad3daf-bd00-5168-885a-74008ce8de35"),
					new()
					{
						Name = "K-13",
						Offset = new() { X = -200, Y = 100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("da390fc5-5361-5af9-9398-d3823b81ecba"),
					new()
					{
						Name = "K-14",
						Offset = new() { X = -100, Y = 100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent1,
					}
				},
				{
					DeviceKeyId.Parse("1a549b65-43d5-5068-a3f5-59429946e404"),
					new()
					{
						Name = "K-15",
						Offset = new() { X = 0, Y = 100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent1,
					}
				},
				{
					DeviceKeyId.Parse("ec06b9a0-0713-5db1-862c-20fafd2b0764"),
					new()
					{
						Name = "K-16",
						Offset = new() { X = 100, Y = 100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent1,
					}
				},
				{
					DeviceKeyId.Parse("cbfef260-a498-599f-a6c0-8a6a51002b76"),
					new()
					{
						Name = "K-17",
						Offset = new() { X = 200, Y = 100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("852caff2-9ef9-59a3-ae41-e5eec3fa0d21"),
					new()
					{
						Name = "K-18",
						Offset = new() { X = 300, Y = 100 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent2,
					}
				},
				{
					DeviceKeyId.Parse("96148043-9890-5767-a464-1b12f126da14"),
					new()
					{
						Name = "K-19",
						Offset = new() { X = -200, Y = 200 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13"),
					new()
					{
						Name = "K-20",
						Offset = new() { X = -100, Y = 200 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("ab6039e8-38dc-5f91-b15c-6678def87cea"),
					new()
					{
						Name = "K-21",
						Offset = new() { X = 0, Y = 200 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("0ef29fa7-07fb-5495-bb6f-33d164eda994"),
					new()
					{
						Name = "K-22",
						Offset = new() { X = 100, Y = 200 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("e18caa6c-d922-558e-b146-0262173a28bd"),
					new()
					{
						Name = "K-23",
						Offset = new() { X = 200, Y = 200 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("7b3285ea-4be6-5eae-9125-cec547fa3fb1"),
					new()
					{
						Name = "K-24",
						Offset = new() { X = 300, Y = 200 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Accent2,
					}
				},
				{
					DeviceKeyId.Parse("4ade2cba-18d3-5fd0-a6d4-ba928bb47009"),
					new()
					{
						Name = "K-25",
						Offset = new() { X = -200, Y = 300 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("474d0b39-6165-58e0-9745-2ca79493a9e8"),
					new()
					{
						Name = "K-26",
						Offset = new() { X = -100, Y = 300 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0"),
					new()
					{
						Name = "K-27",
						Offset = new() { X = 0, Y = 300 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("00a68179-7585-5f08-89fd-c63464760575"),
					new()
					{
						Name = "K-28",
						Offset = new() { X = 100, Y = 300 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("7b743c81-7260-5ae3-8c7e-fc451751a2c7"),
					new()
					{
						Name = "K-29",
						Offset = new() { X = 200, Y = 300 },
						Size = new() { Width = 100, Height = 100 },
						DefaultColor = KeyColor.Regular,
					}
				},
				{
					DeviceKeyId.Parse("15c56a3d-0f31-5ebd-bcf1-63aa968be49a"),
					new()
					{
						Name = "K-30",
						Offset = new() { X = 300, Y = 350 },
						Size = new() { Width = 100, Height = 200 },
						DefaultColor = KeyColor.Accent1,
					}
				},
			},
		};

	private static readonly IReadOnlyCollection<DeviceMetadata> _metadata = [Ck130];
}
