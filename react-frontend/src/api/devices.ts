import useSWR from "swr";

export interface DeviceSummary {
  id: string;
  name: string;
  model: string;
  iconUrl?: string;
}

export interface DeviceProfile {
  keys: readonly DeviceKey[];
  macros: readonly DeviceMacro[];
}

interface DeviceKey {
  id: string;
  layers?: readonly TaggedDeviceLayer[];
  defaultLayer: DeviceKeyLayer;
}

interface TaggedDeviceLayer {
  layer: DeviceKeyLayer;
  tag: readonly string[];
  matchType: TagMatchType;
}

interface DeviceKeyLayer {
  id: string;
  macros: readonly string[];
}

enum TagMatchType {
  All = "All",
  Any = "Any",
}

interface DeviceMacro {
  id: string;
  name: string;
  playChannel: string;
  cutChannels: readonly string[];
  startSequence: Sequence;
  loopSequence: Sequence;
  endSequence: Sequence;
}

interface Sequence {
  actions: readonly Action[];
}

interface Action {
  predelayMs: number;
  actionEvent: ActionEvent;
}

enum ActionEventType {
  Keyboard = "Keyboard",
  Mouse = "Mouse",
  ConsumerControl = "ConsumerControl",
  Layer = "Layer",
  Debug = "Debug",
}

type ActionEvent =
  | KeyboardActionEvent
  | MouseActionEvent
  | ConsumerControlActionEvent
  | LayerActionEvent
  | DebugActionEvent;

type KeyboardActionEvent =
  | { type: ActionEventType.Keyboard; keyDown: KeyboardKey }
  | { keyUp: KeyboardKey };

type MouseActionEvent =
  | { type: ActionEventType.Mouse; buttonDown: MouseButton }
  | { buttonUp: MouseButton }
  | { scroll: MouseScroll }
  | { move: MouseMove };

type ConsumerControlActionEvent = {
  type: ActionEventType.ConsumerControl;
  consumerControl: ConsumerControlEvent;
};

type LayerActionEvent = { type: ActionEventType.Layer } & (
  | { clear: string }
  | { set: string }
);

type DebugActionEvent = { type: ActionEventType.Debug; log: string };

interface MouseScroll {
  x: number;
  y: number;
}

interface MouseMove {
  x: number;
  y: number;
}

export const useDeviceList = (): {
  devices: readonly DeviceSummary[];
  isLoading?: boolean;
  error?: Error;
} => {
  const { data, isLoading, error } = useSWR<{
    devices: readonly DeviceSummary[];
  }>("/devices");

  return {
    devices: data?.devices ?? [],
    isLoading,
    error,
  };
};

export const useDeviceProfile = (
  deviceId: string,
): {
  deviceProfile: DeviceProfile;
  isLoading?: boolean;
  error?: Error;
} => {
  const { data, isLoading, error } = useSWR<{ deviceProfile: DeviceProfile }>(
    `/devices/${deviceId}`,
  );

  return {
    deviceProfile: data?.deviceProfile ?? {
      keys: [],
      macros: [],
    },
    isLoading,
    error,
  };
};

enum KeyboardKey {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  E = "E",
  F = "F",
  G = "G",
  H = "H",
  I = "I",
  J = "J",
  K = "K",
  L = "L",
  M = "M",
  N = "N",
  O = "O",
  P = "P",
  Q = "Q",
  R = "R",
  S = "S",
  T = "T",
  U = "U",
  V = "V",
  W = "W",
  X = "X",
  Y = "Y",
  Z = "Z",
  ONE = "ONE",
  TWO = "TWO",
  THREE = "THREE",
  FOUR = "FOUR",
  FIVE = "FIVE",
  SIX = "SIX",
  SEVEN = "SEVEN",
  EIGHT = "EIGHT",
  NINE = "NINE",
  ZERO = "ZERO",
  ENTER = "ENTER",
  ESCAPE = "ESCAPE",
  BACKSPACE = "BACKSPACE",
  TAB = "TAB",
  SPACEBAR = "SPACEBAR",
  MINUS = "MINUS",
  EQUALS = "EQUALS",
  LEFT_BRACKET = "LEFT_BRACKET",
  RIGHT_BRACKET = "RIGHT_BRACKET",
  BACKSLASH = "BACKSLASH",
  POUND = "POUND",
  SEMICOLON = "SEMICOLON",
  QUOTE = "QUOTE",
  GRAVE_ACCENT = "GRAVE_ACCENT",
  COMMA = "COMMA",
  PERIOD = "PERIOD",
  FORWARD_SLASH = "FORWARD_SLASH",
  CAPS_LOCK = "CAPS_LOCK",
  F1 = "F1",
  F2 = "F2",
  F3 = "F3",
  F4 = "F4",
  F5 = "F5",
  F6 = "F6",
  F7 = "F7",
  F8 = "F8",
  F9 = "F9",
  F10 = "F10",
  F11 = "F11",
  F12 = "F12",
  PRINT_SCREEN = "PRINT_SCREEN",
  SCROLL_LOCK = "SCROLL_LOCK",
  PAUSE = "PAUSE",
  INSERT = "INSERT",
  HOME = "HOME",
  PAGE_UP = "PAGE_UP",
  DELETE = "DELETE",
  END = "END",
  PAGE_DOWN = "PAGE_DOWN",
  RIGHT_ARROW = "RIGHT_ARROW",
  LEFT_ARROW = "LEFT_ARROW",
  DOWN_ARROW = "DOWN_ARROW",
  UP_ARROW = "UP_ARROW",
  KEYPAD_NUMLOCK = "KEYPAD_NUMLOCK",
  KEYPAD_FORWARD_SLASH = "KEYPAD_FORWARD_SLASH",
  KEYPAD_ASTERISK = "KEYPAD_ASTERISK",
  KEYPAD_MINUS = "KEYPAD_MINUS",
  KEYPAD_PLUS = "KEYPAD_PLUS",
  KEYPAD_ENTER = "KEYPAD_ENTER",
  KEYPAD_ONE = "KEYPAD_ONE",
  KEYPAD_TWO = "KEYPAD_TWO",
  KEYPAD_THREE = "KEYPAD_THREE",
  KEYPAD_FOUR = "KEYPAD_FOUR",
  KEYPAD_FIVE = "KEYPAD_FIVE",
  KEYPAD_SIX = "KEYPAD_SIX",
  KEYPAD_SEVEN = "KEYPAD_SEVEN",
  KEYPAD_EIGHT = "KEYPAD_EIGHT",
  KEYPAD_NINE = "KEYPAD_NINE",
  KEYPAD_ZERO = "KEYPAD_ZERO",
  KEYPAD_PERIOD = "KEYPAD_PERIOD",
  KEYPAD_BACKSLASH = "KEYPAD_BACKSLASH",
  APPLICATION = "APPLICATION",

  //POWER = "POWER",
  KEYPAD_EQUALS = "KEYPAD_EQUALS",
  F13 = "F13",
  F14 = "F14",
  F15 = "F15",
  F16 = "F16",
  F17 = "F17",
  F18 = "F18",
  F19 = "F19",
  F20 = "F20",
  F21 = "F21",
  F22 = "F22",
  F23 = "F23",
  F24 = "F24",

  MENU = "MENU",

  LEFT_CONTROL = "LEFT_CONTROL",
  LEFT_SHIFT = "LEFT_SHIFT",
  LEFT_ALT = "LEFT_ALT",
  LEFT_GUI = "LEFT_GUI",
  RIGHT_CONTROL = "RIGHT_CONTROL",
  RIGHT_SHIFT = "RIGHT_SHIFT",
  RIGHT_ALT = "RIGHT_ALT",
  RIGHT_GUI = "RIGHT_GUI",
}

enum MouseButton {
  Left = "Left",
  Right = "Right",
  Middle = "Middle",
  Back = "Back",
  Forward = "Forward",
}

enum ConsumerControlEvent {
  RECORD = "RECORD",
  FAST_FORWARD = "FAST_FORWARD",
  REWIND = "REWIND",
  SCAN_NEXT_TRACK = "SCAN_NEXT_TRACK",
  SCAN_PREVIOUS_TRACK = "SCAN_PREVIOUS_TRACK",
  STOP = "STOP",
  EJECT = "EJECT",
  PLAY_PAUSE = "PLAY_PAUSE",
  MUTE = "MUTE",
  VOLUME_DECREMENT = "VOLUME_DECREMENT",
  VOLUME_INCREMENT = "VOLUME_INCREMENT",
}
