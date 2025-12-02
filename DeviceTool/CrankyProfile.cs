using Cardboard.Device;
using Cardboard.Repositories;

namespace DeviceTool;

public class CrankyProfileBuilder : IProfileBuilder
{
	public DeviceProfile Build(DeviceId deviceId, string name, IdGenerator generator)
	{
		var escMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "Esc", KeyboardKey.ESCAPE);
		var oneMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "1", KeyboardKey.ONE);
		var twoMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "2", KeyboardKey.TWO);
		var threeMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "3", KeyboardKey.THREE);
		var fourMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "4", KeyboardKey.FOUR);
		var fiveMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "5", KeyboardKey.FIVE);
		var graveAccentMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "`", KeyboardKey.GRAVE_ACCENT);
		var qMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "Q", KeyboardKey.Q);
		var wMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "W", KeyboardKey.W);
		var eMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "E", KeyboardKey.E);
		var rMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "R", KeyboardKey.R);
		var tMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "T", KeyboardKey.T);
		var tabMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "Tab", KeyboardKey.TAB);
		var aMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "A", KeyboardKey.A);
		var sMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "S", KeyboardKey.S);
		var dMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "D", KeyboardKey.D);
		var fMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "F", KeyboardKey.F);
		var gMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "G", KeyboardKey.G);
		var shiftMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "Shift", KeyboardKey.LEFT_SHIFT);
		var zMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "Z", KeyboardKey.Z);
		var xMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "X", KeyboardKey.X);
		var mMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "M", KeyboardKey.M);
		var vMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "V", KeyboardKey.V);
		var bMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "B", KeyboardKey.B);
		var ctrlMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "Ctrl", KeyboardKey.LEFT_CONTROL);
		var altMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "Alt", KeyboardKey.LEFT_ALT);
		var sixMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "6", KeyboardKey.SIX);
		var sevenMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "7", KeyboardKey.SEVEN);
		var spaceMacro = Utilities.BasicKeyMacro(generator.NewMacroId(), "Space", KeyboardKey.SPACEBAR);

		var fnLayerTag = LayerTag.Parse("fn");
		var elderScrollsLayerTag = LayerTag.Parse("tes");

		var fnMacro = new Macro
		{
			Id = generator.NewMacroId(),
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
			Id = generator.NewMacroId(),
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
			Id = generator.NewMacroId(),
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
			Id = generator.NewMacroId(),
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
			Utilities.BasicKey(generator.NewLayerId(), escMacro),
			Utilities.BasicKey(generator.NewLayerId(), oneMacro),
			Utilities.BasicKey(generator.NewLayerId(), twoMacro),
			Utilities.BasicKey(generator.NewLayerId(), threeMacro),
			Utilities.BasicKey(generator.NewLayerId(), fourMacro),
			new()
			{
				Layers =
				[
					new()
					{
						Tags = [fnLayerTag],
						MatchType = TagMatchType.Any,
						Layer = new() { Id = generator.NewLayerId(), Macros = [recordLastMinuteMacro.Id] },
					},
				],
				DefaultLayer = new() { Id = generator.NewLayerId(), Macros = [fiveMacro.Id] },
			},
			Utilities.BasicKey(generator.NewLayerId(), graveAccentMacro),
			Utilities.BasicKey(generator.NewLayerId(), qMacro),
			Utilities.BasicKey(generator.NewLayerId(), wMacro),
			Utilities.BasicKey(generator.NewLayerId(), eMacro),
			Utilities.BasicKey(generator.NewLayerId(), rMacro),
			Utilities.BasicKey(generator.NewLayerId(), tMacro),
			Utilities.BasicKey(generator.NewLayerId(), tabMacro),
			Utilities.BasicKey(generator.NewLayerId(), aMacro),
			Utilities.BasicKey(generator.NewLayerId(), sMacro),
			Utilities.BasicKey(generator.NewLayerId(), dMacro),
			Utilities.BasicKey(generator.NewLayerId(), fMacro),
			Utilities.BasicKey(generator.NewLayerId(), gMacro),
			Utilities.BasicKey(generator.NewLayerId(), shiftMacro),
			Utilities.BasicKey(generator.NewLayerId(), zMacro),
			Utilities.BasicKey(generator.NewLayerId(), xMacro),
			Utilities.BasicKey(generator.NewLayerId(), mMacro),
			new()
			{
				Layers =
				[
					new()
					{
						Tags = [elderScrollsLayerTag],
						MatchType = TagMatchType.Any,
						Layer = new() { Id = generator.NewLayerId(), Macros = [rapidFMacro.Id] },
					},
				],
				DefaultLayer = new() { Id = generator.NewLayerId(), Macros = [vMacro.Id] },
			},
			Utilities.BasicKey(generator.NewLayerId(), fnMacro),
			Utilities.BasicKey(generator.NewLayerId(), ctrlMacro),
			Utilities.BasicKey(generator.NewLayerId(), altMacro),
			Utilities.BasicKey(generator.NewLayerId(), sixMacro),
			Utilities.BasicKey(generator.NewLayerId(), sevenMacro),
			Utilities.BasicKey(generator.NewLayerId(), rapidSpaceMacro),
			Utilities.BasicKey(generator.NewLayerId(), spaceMacro)
		);

		VirtualKey[] virtualKeys = [new() { Layers = Utilities.BasicKey(generator.NewLayerId(), oneMacro) }];

		return ProfileBuilder.Build(deviceId, name, macros, keys, virtualKeys).ToDevice();
	}
}
