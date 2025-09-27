using Cardboard.Device;

namespace DeviceTool;

public static class CrankyProfile
{
	public static DeviceProfile Profile { get; } = Build();

	private static DeviceProfile Build()
	{
		var escMacro = Utilities.BasicKeyMacro(MacroId.New(), "Esc", KeyboardKey.ESCAPE);
		var oneMacro = Utilities.BasicKeyMacro(MacroId.New(), "1", KeyboardKey.ONE);
		var twoMacro = Utilities.BasicKeyMacro(MacroId.New(), "2", KeyboardKey.TWO);
		var threeMacro = Utilities.BasicKeyMacro(MacroId.New(), "3", KeyboardKey.THREE);
		var fourMacro = Utilities.BasicKeyMacro(MacroId.New(), "4", KeyboardKey.FOUR);
		var fiveMacro = Utilities.BasicKeyMacro(MacroId.New(), "5", KeyboardKey.FIVE);
		var graveAccentMacro = Utilities.BasicKeyMacro(MacroId.New(), "`", KeyboardKey.GRAVE_ACCENT);
		var qMacro = Utilities.BasicKeyMacro(MacroId.New(), "Q", KeyboardKey.Q);
		var wMacro = Utilities.BasicKeyMacro(MacroId.New(), "W", KeyboardKey.W);
		var eMacro = Utilities.BasicKeyMacro(MacroId.New(), "E", KeyboardKey.E);
		var rMacro = Utilities.BasicKeyMacro(MacroId.New(), "R", KeyboardKey.R);
		var tMacro = Utilities.BasicKeyMacro(MacroId.New(), "T", KeyboardKey.T);
		var tabMacro = Utilities.BasicKeyMacro(MacroId.New(), "Tab", KeyboardKey.TAB);
		var aMacro = Utilities.BasicKeyMacro(MacroId.New(), "A", KeyboardKey.A);
		var sMacro = Utilities.BasicKeyMacro(MacroId.New(), "S", KeyboardKey.S);
		var dMacro = Utilities.BasicKeyMacro(MacroId.New(), "D", KeyboardKey.D);
		var fMacro = Utilities.BasicKeyMacro(MacroId.New(), "F", KeyboardKey.F);
		var gMacro = Utilities.BasicKeyMacro(MacroId.New(), "G", KeyboardKey.G);
		var shiftMacro = Utilities.BasicKeyMacro(MacroId.New(), "Shift", KeyboardKey.LEFT_SHIFT);
		var zMacro = Utilities.BasicKeyMacro(MacroId.New(), "Z", KeyboardKey.Z);
		var xMacro = Utilities.BasicKeyMacro(MacroId.New(), "X", KeyboardKey.X);
		var mMacro = Utilities.BasicKeyMacro(MacroId.New(), "M", KeyboardKey.M);
		var vMacro = Utilities.BasicKeyMacro(MacroId.New(), "V", KeyboardKey.V);
		var bMacro = Utilities.BasicKeyMacro(MacroId.New(), "B", KeyboardKey.B);
		var ctrlMacro = Utilities.BasicKeyMacro(MacroId.New(), "Ctrl", KeyboardKey.LEFT_CONTROL);
		var altMacro = Utilities.BasicKeyMacro(MacroId.New(), "Alt", KeyboardKey.LEFT_ALT);
		var sixMacro = Utilities.BasicKeyMacro(MacroId.New(), "6", KeyboardKey.SIX);
		var sevenMacro = Utilities.BasicKeyMacro(MacroId.New(), "7", KeyboardKey.SEVEN);
		var spaceMacro = Utilities.BasicKeyMacro(MacroId.New(), "Space", KeyboardKey.SPACEBAR);

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

		var keys = Ck130.Keys(
			Utilities.BasicKey(LayerId.New(), escMacro),
			Utilities.BasicKey(LayerId.New(), oneMacro),
			Utilities.BasicKey(LayerId.New(), twoMacro),
			Utilities.BasicKey(LayerId.New(), threeMacro),
			Utilities.BasicKey(LayerId.New(), fourMacro),
			new()
			{
				Layers =
				[
					new()
					{
						Layer = new() { Id = LayerId.New(), Macros = [recordLastMinuteMacro.Id] },
						Tags = [fnLayerTag],
						MatchType = TagMatchType.Any,
					},
				],
				DefaultLayer = new() { Id = LayerId.New(), Macros = [fiveMacro.Id] },
			},
			Utilities.BasicKey(LayerId.New(), graveAccentMacro),
			Utilities.BasicKey(LayerId.New(), qMacro),
			Utilities.BasicKey(LayerId.New(), wMacro),
			Utilities.BasicKey(LayerId.New(), eMacro),
			Utilities.BasicKey(LayerId.New(), rMacro),
			Utilities.BasicKey(LayerId.New(), tMacro),
			Utilities.BasicKey(LayerId.New(), tabMacro),
			Utilities.BasicKey(LayerId.New(), aMacro),
			Utilities.BasicKey(LayerId.New(), sMacro),
			Utilities.BasicKey(LayerId.New(), dMacro),
			Utilities.BasicKey(LayerId.New(), fMacro),
			Utilities.BasicKey(LayerId.New(), gMacro),
			Utilities.BasicKey(LayerId.New(), shiftMacro),
			Utilities.BasicKey(LayerId.New(), zMacro),
			Utilities.BasicKey(LayerId.New(), xMacro),
			Utilities.BasicKey(LayerId.New(), mMacro),
			new()
			{
				Layers =
				[
					new()
					{
						Tags = [elderScrollsLayerTag],
						MatchType = TagMatchType.Any,
						Layer = new() { Id = LayerId.New(), Macros = [rapidFMacro.Id] },
					},
				],
				DefaultLayer = new() { Id = LayerId.New(), Macros = [vMacro.Id] },
			},
			Utilities.BasicKey(LayerId.New(), fnMacro),
			Utilities.BasicKey(LayerId.New(), ctrlMacro),
			Utilities.BasicKey(LayerId.New(), altMacro),
			Utilities.BasicKey(LayerId.New(), sixMacro),
			Utilities.BasicKey(LayerId.New(), sevenMacro),
			Utilities.BasicKey(LayerId.New(), rapidSpaceMacro),
			Utilities.BasicKey(LayerId.New(), spaceMacro)
		);

		VirtualKey[] virtualKeys = [new() { Layers = Utilities.BasicKey(LayerId.New(), oneMacro) }];

		return ProfileBuilder.Build(macros, keys, virtualKeys);
	}
}
