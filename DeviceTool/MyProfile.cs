using System.Diagnostics;
using Cardboard.Device;

namespace DeviceTool;

public static class MyProfile
{
	public static DeviceProfile Value { get; } = Build();

	private static DeviceProfile Build()
	{
		var escMacro = BasicKeyMacro(MacroId.New(), "Esc", KeyboardKey.ESCAPE);
		var oneMacro = BasicKeyMacro(MacroId.New(), "1", KeyboardKey.ONE);
		var twoMacro = BasicKeyMacro(MacroId.New(), "2", KeyboardKey.TWO);
		var threeMacro = BasicKeyMacro(MacroId.New(), "3", KeyboardKey.THREE);
		var fourMacro = BasicKeyMacro(MacroId.New(), "4", KeyboardKey.FOUR);
		var fiveMacro = BasicKeyMacro(MacroId.New(), "5", KeyboardKey.FIVE);
		var graveAccentMacro = BasicKeyMacro(MacroId.New(), "`", KeyboardKey.GRAVE_ACCENT);
		var qMacro = BasicKeyMacro(MacroId.New(), "Q", KeyboardKey.Q);
		var wMacro = BasicKeyMacro(MacroId.New(), "W", KeyboardKey.W);
		var eMacro = BasicKeyMacro(MacroId.New(), "E", KeyboardKey.E);
		var rMacro = BasicKeyMacro(MacroId.New(), "R", KeyboardKey.R);
		var tMacro = BasicKeyMacro(MacroId.New(), "T", KeyboardKey.T);
		var tabMacro = BasicKeyMacro(MacroId.New(), "Tab", KeyboardKey.TAB);
		var aMacro = BasicKeyMacro(MacroId.New(), "A", KeyboardKey.A);
		var sMacro = BasicKeyMacro(MacroId.New(), "S", KeyboardKey.S);
		var dMacro = BasicKeyMacro(MacroId.New(), "D", KeyboardKey.D);
		var fMacro = BasicKeyMacro(MacroId.New(), "F", KeyboardKey.F);
		var gMacro = BasicKeyMacro(MacroId.New(), "G", KeyboardKey.G);
		var shiftMacro = BasicKeyMacro(MacroId.New(), "Shift", KeyboardKey.LEFT_SHIFT);
		var zMacro = BasicKeyMacro(MacroId.New(), "Z", KeyboardKey.Z);
		var xMacro = BasicKeyMacro(MacroId.New(), "X", KeyboardKey.X);
		var mMacro = BasicKeyMacro(MacroId.New(), "M", KeyboardKey.M);
		var vMacro = BasicKeyMacro(MacroId.New(), "V", KeyboardKey.V);
		var bMacro = BasicKeyMacro(MacroId.New(), "B", KeyboardKey.B);
		var ctrlMacro = BasicKeyMacro(MacroId.New(), "Ctrl", KeyboardKey.LEFT_CONTROL);
		var altMacro = BasicKeyMacro(MacroId.New(), "Alt", KeyboardKey.LEFT_ALT);
		var sixMacro = BasicKeyMacro(MacroId.New(), "6", KeyboardKey.SIX);
		var sevenMacro = BasicKeyMacro(MacroId.New(), "7", KeyboardKey.SEVEN);
		var spaceMacro = BasicKeyMacro(MacroId.New(), "Space", KeyboardKey.SPACEBAR);

		var fnLayerTag = LayerTag.Parse("fn");
		var elderScrollsLayerTag = LayerTag.Parse("tes");

		var fnMacro = new Macro
		{
			Id = MacroId.New(),
			Name = "Fn",
			CutChannels = [],
			StartSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Layer = new() { Set = fnLayerTag } } }],
			},
			LoopSequence = new() { Actions = [] },
			EndSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Layer = new() { Clear = fnLayerTag } } }],
			},
		};

		var recordLastMinuteMacro = new Macro
		{
			Id = MacroId.New(),
			Name = "Record Last Minute",
			CutChannels = [],
			StartSequence = new()
			{
				Actions =
				[
					new() { ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.LEFT_ALT } } },
					new() { ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.F10 } } },
				],
			},
			LoopSequence = new() { Actions = [] },
			EndSequence = new()
			{
				Actions =
				[
					new() { ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.LEFT_ALT } } },
					new() { ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.F10 } } },
				],
			},
		};

		var rapidSpaceMacro = new Macro
		{
			Id = MacroId.New(),
			Name = "Rapid Space",
			CutChannels = [],
			StartSequence = new()
			{
				Actions =
				[
					new() { ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.SPACEBAR } } },
				],
			},
			LoopSequence = new()
			{
				Actions =
				[
					new()
					{
						PredelayMs = 50,
						ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.SPACEBAR } },
					},
					new()
					{
						PredelayMs = 50,
						ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.SPACEBAR } },
					},
				],
			},
			EndSequence = new()
			{
				Actions =
				[
					new()
					{
						PredelayMs = 50,
						ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.SPACEBAR } },
					},
				],
			},
		};

		// oblivion
		var rapidFMacro = new Macro
		{
			Id = MacroId.New(),
			Name = "Rapid F",
			CutChannels = [],
			StartSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.F } } }],
			},
			LoopSequence = new()
			{
				Actions =
				[
					new()
					{
						PredelayMs = 10,
						ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.F } },
					},
					new()
					{
						PredelayMs = 10,
						ActionEvent = new() { Keyboard = new() { KeyDown = KeyboardKey.F } },
					},
				],
			},
			EndSequence = new()
			{
				Actions =
				[
					new()
					{
						PredelayMs = 10,
						ActionEvent = new() { Keyboard = new() { KeyUp = KeyboardKey.F } },
					},
				],
			},
		};

		Macro[] macros =
		[
			escMacro,
			oneMacro,
			twoMacro,
			threeMacro,
			fourMacro,
			fiveMacro,
			graveAccentMacro,
			qMacro,
			wMacro,
			eMacro,
			rMacro,
			tMacro,
			tabMacro,
			aMacro,
			sMacro,
			dMacro,
			fMacro,
			gMacro,
			shiftMacro,
			zMacro,
			xMacro,
			mMacro,
			vMacro,
			bMacro,
			ctrlMacro,
			altMacro,
			sixMacro,
			sevenMacro,
			spaceMacro,
			fnMacro,
			recordLastMinuteMacro,
			// oblivion
			rapidFMacro,
			rapidSpaceMacro,
		];

		DeviceKey[] keys =
		[
			new()
			{
				Id = DeviceKeyId.Parse("0661ee85-348b-5d93-b5e2-ac11cfa5344b"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [escMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("87c4fd79-143b-576b-afa2-bea59e4cd02c"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [oneMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("1d652794-96a4-5c59-9948-afd441289317"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [twoMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("de57737c-e6c1-5818-bf94-d126ff5304a3"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [threeMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("85c20588-8148-5785-9e9f-44976e8dfef8"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [fourMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("b6ee974a-b405-5367-8c9f-e70a75045c37"),
				Layers = new()
				{
					Layers =
					[
						new()
						{
							Layer = new() { Id = LayerId.New(), Macros = [recordLastMinuteMacro.Id] },
							Tags = [fnLayerTag],
							MatchType = TagMatchType.All,
						},
					],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [fiveMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("8a1052be-8165-5976-849b-511ce92f9956"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [graveAccentMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("91206d06-70d4-5b75-9fdf-aad7f367fff5"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [qMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("7abd3edf-f94c-522e-b2be-06a88bdb1cc9"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [wMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("a32da69a-7f91-5f5a-87d2-dd5e4776b1c4"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [eMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("3a801a21-1ef7-5803-bf42-ecd1e8444656"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [rMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("c54ec31f-2381-5636-b0a5-edd448294b88"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [tMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("16ad3daf-bd00-5168-885a-74008ce8de35"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [tabMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("da390fc5-5361-5af9-9398-d3823b81ecba"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [aMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("1a549b65-43d5-5068-a3f5-59429946e404"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [sMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("ec06b9a0-0713-5db1-862c-20fafd2b0764"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [dMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("cbfef260-a498-599f-a6c0-8a6a51002b76"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [fMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("852caff2-9ef9-59a3-ae41-e5eec3fa0d21"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [gMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("96148043-9890-5767-a464-1b12f126da14"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [shiftMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("7a30b4b5-f6b1-5aae-8cf5-f28bca7c1c13"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [zMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("ab6039e8-38dc-5f91-b15c-6678def87cea"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [xMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("0ef29fa7-07fb-5495-bb6f-33d164eda994"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [mMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("e18caa6c-d922-558e-b146-0262173a28bd"),
				Layers = new()
				{
					Layers =
					[
						new()
						{
							Tags = [elderScrollsLayerTag],
							MatchType = TagMatchType.All,
							Layer = new() { Id = LayerId.New(), Macros = [rapidFMacro.Id] },
						},
					],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [vMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("7b3285ea-4be6-5eae-9125-cec547fa3fb1"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [fnMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("4ade2cba-18d3-5fd0-a6d4-ba928bb47009"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [ctrlMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("474d0b39-6165-58e0-9745-2ca79493a9e8"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [altMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("67fbbc39-8540-571c-a8e7-0a8bffbdc4c0"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [sixMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("00a68179-7585-5f08-89fd-c63464760575"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [sevenMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("7b743c81-7260-5ae3-8c7e-fc451751a2c7"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [rapidSpaceMacro.Id] },
				},
			},
			new()
			{
				Id = DeviceKeyId.Parse("15c56a3d-0f31-5ebd-bcf1-63aa968be49a"),
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [spaceMacro.Id] },
				},
			},
		];

		VirtualKey[] virtualKeys =
		[
			new()
			{
				Layers = new()
				{
					Layers = [],
					DefaultLayer = new() { Id = LayerId.New(), Macros = [oneMacro.Id] },
				},
			},
		];

		Debug.Assert(keys.Length == 30, "Keys count should be 30");
		Debug.Assert(
			GetMacrosInKeys(keys, virtualKeys).All(m => macros.Any(x => x.Id == m)),
			"All macros used in keys should also be present in macro list."
		);

		return new()
		{
			Keys = keys,
			VirtualKeys = virtualKeys,
			Macros = macros,
		};
	}

	private static Macro BasicKeyMacro(MacroId id, string name, KeyboardKey key)
	{
		return new()
		{
			Id = id,
			Name = name,
			CutChannels = [],
			StartSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyDown = key } } }],
			},
			LoopSequence = new() { Actions = [] },
			EndSequence = new()
			{
				Actions = [new() { ActionEvent = new() { Keyboard = new() { KeyUp = key } } }],
			},
		};
	}

	private static IEnumerable<MacroId> GetMacrosInKeys(
		IEnumerable<DeviceKey> keys,
		IEnumerable<VirtualKey> virtualKeys
	)
	{
		return keys.Select(x => x.Layers)
			.Concat(virtualKeys.Select(x => x.Layers))
			.SelectMany(x => x.Layers.SelectMany(tl => tl.Layer.Macros).Concat(x.DefaultLayer.Macros));
	}
}
