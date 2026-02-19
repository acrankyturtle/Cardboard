export interface FirmwareListEntry {
  deviceTypeId: string;
  name: string;
  variant?: string;
  latestVersion: string;
}

export interface DeviceSummary {
  id: string;
  name: string;
  model: string;
  iconUrl?: string;
}

export interface DeviceDetails {
  id: string;
  name: string;
  type: string;
  variant?: string;
  model: string;
  iconUrl?: string;
  version: string;
  latestVersion?: string;
  updateAvailable: boolean;
  settings: DeviceSettingsReport;
  status: DeviceStatusReport;
  commands: readonly CommandInfo[];
  keyMap: readonly KeyInfo[];
  virtualKeyCount: number;
}

export interface CommandInfo {
  id: string;
  name: string;
}

export interface KeyInfo {
  keyId: string;
  name: string;
  offset: { x: number; y: number };
  size: { width: number; height: number };
  color: KeyColor;
}

export enum KeyColor {
  Regular = "Regular",
  Accent1 = "Accent1",
  Accent2 = "Accent2",
  Virtual = "Virtual",
}

export interface DeviceSettingsReport {
  isMouseEnabled: boolean;
}

export interface DeviceSettings {
  mouseEnabled: boolean;
}

export interface DeviceStatusReport {
  tick: number;
  allocated: number;
  maxAllocated: number;
  allocatorSize: number;
  errors: readonly DeviceStatusError[];
}

export interface DeviceStatusError {
  timestamp: string;
  message: string;
}

export interface DeviceProfile {
  name: string;
  keys: readonly DeviceKey[];
  virtualKeys: readonly VirtualKey[];
  macros: readonly DeviceMacro[];
}

export interface DeviceKey {
  id: string;
  layers: DeviceLayers;
}

export interface VirtualKey {
  layers: DeviceLayers;
}

export interface DeviceLayers {
  layers: readonly TaggedDeviceLayer[];
  defaultLayer: DeviceKeyLayer;
}

export interface TaggedDeviceLayer {
  tags: readonly string[];
  matchType: TagMatchType;
  layer: DeviceKeyLayer;
}

export interface DeviceKeyLayer {
  id: string;
  macros: readonly string[];
}

export enum TagMatchType {
  Any = "Any",
  All = "All",
}

export interface DeviceMacro {
  id: string;
  name: string;
  playChannel?: number;
  cutChannels: readonly number[];
  startSequence: Sequence;
  loopSequence: Sequence;
  endSequence: Sequence;
}

export interface Sequence {
  actions: readonly Action[];
}

export interface Action {
  predelayMs: number;
  actionEvent: ActionEvent;
}

export type ActionEvent =
  | { keyboard: KeyboardActionEvent }
  | { mouse: MouseActionEvent }
  | { consumerControl: ConsumerControlEvent }
  | { layer: LayerActionEvent }
  | { debug: DebugActionEvent };

export type KeyboardActionEvent =
  | KeyboardKeyDownActionEvent
  | KeyboardKeyUpActionEvent;

export type KeyboardKeyDownActionEvent = {
  keyDown: KeyboardKey;
};
export type KeyboardKeyUpActionEvent = {
  keyUp: KeyboardKey;
};

export type MouseActionEvent =
  | MouseButtonDownActionEvent
  | MouseButtonUpActionEvent
  | MouseScrollActionEvent
  | MouseMoveActionEvent;

export type MouseButtonDownActionEvent = {
  buttonDown: MouseButton;
};

export type MouseButtonUpActionEvent = {
  buttonUp: MouseButton;
};

export type MouseScrollActionEvent = {
  scroll: MouseScroll;
};

export type MouseMoveActionEvent = {
  move: MouseMove;
};

export type LayerActionEvent = LayerClearActionEvent | LayerSetActionEvent;

export type LayerClearActionEvent = { clear: string };
export type LayerSetActionEvent = { set: string };

export type DebugActionEvent = { log: string };

interface MouseScroll {
  x: number;
  y: number;
}

interface MouseMove {
  x: number;
  y: number;
}

export enum KeyboardKey {
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

export enum MouseButton {
  Left = "Left",
  Right = "Right",
  Middle = "Middle",
  Back = "Back",
  Forward = "Forward",
}

export enum ConsumerControlEvent {
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
