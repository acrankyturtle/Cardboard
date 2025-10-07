import useSWR from "swr";
import { getApiUrl } from "./cardboardApi.ts";

export const useDeviceList = (): {
  devices: readonly DeviceSummary[];
  isLoading?: boolean;
  error?: Error;
} => {
  const { data, isLoading, error } = useSWR<{
    devices: readonly DeviceSummary[];
  }>("devices");

  return {
    devices: data?.devices ?? [],
    // devices: fakeDevices,
    isLoading,
    error,
  };
};

export const useDeviceDetails = (deviceId: string) => {
  const { data, isLoading, error } = useSWR<{ deviceDetails: DeviceDetails }>(
    `devices/${deviceId}`,
  );

  return {
    device: data?.deviceDetails,
    isLoading,
    error,
  };
};

export const useDeviceProfile = (
  deviceId: string,
): {
  profile: DeviceProfile | undefined;
  isLoading?: boolean;
  error?: Error;
} => {
  const { data, isLoading, error } = useSWR<{ deviceProfile: DeviceProfile }>(
    `devices/${deviceId}/profile`,
  );

  return {
    profile: data?.deviceProfile,
    isLoading,
    error,
  };
};

export const updateDeviceProfile = async (
  deviceId: string,
  profile: DeviceProfile,
): Promise<"success" | { error: string }> => {
  const response = await fetch(getApiUrl(`devices/${deviceId}/profile`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    return { error: `Failed to update device profile: ${response.statusText}` };
  }

  return "success";
};

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
  model: string;
  iconUrl?: string;
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
export interface DeviceStatusReport {
  tick: number;
  allocated: number;
  allocatorSize: number;
  errors: readonly DeviceStatusError[];
}

export interface DeviceStatusError {
  timestamp: string;
  message: string;
}

export interface DeviceProfile {
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

export const isVirtualKey = (key: DeviceKey | VirtualKey): key is VirtualKey =>
  !("id" in key);

export interface DeviceLayers {
  layers: readonly TaggedDeviceLayer[];
  defaultLayer: DeviceKeyLayer;
}

export interface TaggedDeviceLayer {
  layer: DeviceKeyLayer;
  tags: readonly string[];
  matchType: TagMatchType;
}

export interface DeviceKeyLayer {
  id: string;
  macros: readonly string[];
}

export const isTaggedDeviceLayer = (
  layer: DeviceKeyLayer | TaggedDeviceLayer,
): layer is TaggedDeviceLayer => "tags" in layer && "matchType" in layer;

export enum TagMatchType {
  Any = "Any",
  All = "All",
}

export interface DeviceMacro {
  id: string;
  name: string;
  playChannel?: string;
  cutChannels: readonly string[];
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

export const isKeyboardActionEvent = (
  e: ActionEvent,
): e is { keyboard: KeyboardActionEvent } => "keyboard" in e;

export const isMouseActionEvent = (
  e: ActionEvent,
): e is { mouse: MouseActionEvent } => "mouse" in e;

export const isConsumerControlActionEvent = (
  e: ActionEvent,
): e is { consumerControl: ConsumerControlEvent } => "consumerControl" in e;

export const isLayerActionEvent = (
  e: ActionEvent,
): e is { layer: LayerActionEvent } => "layer" in e;

export const isDebugActionEvent = (
  e: ActionEvent,
): e is { debug: DebugActionEvent } => "debug" in e;

export type KeyboardActionEvent =
  | KeyboardKeyDownActionEvent
  | KeyboardKeyUpActionEvent;

export type KeyboardKeyDownActionEvent = {
  keyDown: KeyboardKey;
};
export type KeyboardKeyUpActionEvent = {
  keyUp: KeyboardKey;
};

export const isKeyDownEvent = (
  e: KeyboardActionEvent,
): e is KeyboardKeyDownActionEvent => "keyDown" in e;

export const isKeyUpEvent = (
  e: KeyboardActionEvent,
): e is KeyboardKeyUpActionEvent => "keyUp" in e;

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

export const isMouseDownEvent = (
  e: MouseActionEvent,
): e is MouseButtonDownActionEvent => "buttonDown" in e;

export const isMouseUpEvent = (
  e: MouseActionEvent,
): e is MouseButtonUpActionEvent => "buttonUp" in e;

export const isMouseScrollEvent = (
  e: MouseActionEvent,
): e is MouseScrollActionEvent => "scroll" in e;

export const isMouseMoveEvent = (
  e: MouseActionEvent,
): e is MouseMoveActionEvent => "move" in e;

export type LayerActionEvent = LayerClearActionEvent | LayerSetActionEvent;

export type LayerClearActionEvent = { clear: string };
export type LayerSetActionEvent = { set: string };

export const isLayerClearEvent = (
  e: LayerActionEvent,
): e is LayerClearActionEvent => "clear" in e;

export const isLayerSetEvent = (
  e: LayerActionEvent,
): e is LayerSetActionEvent => "set" in e;

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

// const fakeDevices = [
//   {
//     id: "0",
//     name: "Device 1",
//     model: "Model 1",
//   },
//   {
//     id: "1",
//     name: "Device 2",
//     model: "Model 2",
//   },
//   {
//     id: "2",
//     name: "Device 3",
//     model: "Model 3",
//   },
//   {
//     id: "3",
//     name: "Device 4",
//     model: "Model 4",
//   },
//   {
//     id: "4",
//     name: "Device 5",
//     model: "Model 5",
//   },
//   {
//     id: "5",
//     name: "Device 6",
//     model: "Model 6",
//   },
//   {
//     id: "6",
//     name: "Device 7",
//     model: "Model 7",
//   },
//   {
//     id: "7",
//     name: "Device 8",
//     model: "Model 8",
//   },
//   {
//     id: "8",
//     name: "Device 9",
//     model: "Model 9",
//   },
//   {
//     id: "9",
//     name: "Device 10",
//     model: "Model 10",
//   },
//   {
//     id: "10",
//     name: "Device 11",
//     model: "Model 11",
//   },
//   {
//     id: "11",
//     name: "Device 12",
//     model: "Model 12",
//   },
//   {
//     id: "12",
//     name: "Device 13",
//     model: "Model 13",
//   },
//   {
//     id: "13",
//     name: "Device 14",
//     model: "Model 14",
//   },
//   {
//     id: "14",
//     name: "Device 15",
//     model: "Model 15",
//   },
//   {
//     id: "15",
//     name: "Device 16",
//     model: "Model 16",
//   },
//   {
//     id: "16",
//     name: "Device 17",
//     model: "Model 17",
//   },
//   {
//     id: "17",
//     name: "Device 18",
//     model: "Model 18",
//   },
//   {
//     id: "18",
//     name: "Device 19",
//     model: "Model 19",
//   },
//   {
//     id: "19",
//     name: "Device 20",
//     model: "Model 20",
//   },
// ];
