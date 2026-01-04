import useSWR from "swr";
import { getApiUrl } from "./cardboardApi.ts";

export interface Association {
  id: string;
  data: AssociationData;
}

export interface AssociationData {
  tags: readonly string[];
  virtualKeys: readonly VirtualKeyAssociation[];
  matchOnPath: readonly string[];
  emblem?: ApplicationIconEmblem;
}

export interface VirtualKeyAssociation {
  deviceId: string;
  deviceMatching: VirtualKeyDeviceMatch;
  virtualKey: number;
}

export interface VirtualKeyDeviceMatch {
  vid?: string;
  pid?: string;
  serial?: string;
  description?: string;
  inputKey: string;
}

export interface ApplicationIconEmblem {
  position: "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight";
  shape: "Circle" | "Square" | "Triangle";
  color: string;
}

export const useAssociations = (): {
  associations: readonly Association[];
  isLoading?: boolean;
  error?: Error;
  mutate: () => void;
} => {
  const { data, isLoading, error, mutate } = useSWR<{
    associations: readonly Association[];
  }>("tags");

  return {
    associations: data?.associations ?? [],
    isLoading,
    error,
    mutate,
  };
};

export const getAssociation = async (id: string): Promise<Association> => {
  const response = await fetch(getApiUrl(`tags/${id}`));

  if (!response.ok) {
    throw new Error(`Failed to fetch association: ${response.statusText}`);
  }

  const data: { association: Association } = await response.json();
  return data.association;
};

export const createAssociation = async (
  data: AssociationData,
): Promise<{ id: string } | { error: string }> => {
  try {
    const response = await fetch(getApiUrl("tags"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return { error: `Failed to create association: ${response.statusText}` };
    }

    const result: { id: string } = await response.json();
    return result;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create association",
    };
  }
};

export const updateAssociation = async (
  id: string,
  data: AssociationData,
): Promise<"success" | { error: string }> => {
  try {
    const response = await fetch(getApiUrl(`tags/${id}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return { error: `Failed to update association: ${response.statusText}` };
    }

    return "success";
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update association",
    };
  }
};

export const deleteAssociation = async (
  id: string,
): Promise<"success" | { error: string }> => {
  try {
    const response = await fetch(getApiUrl(`tags/${id}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      return { error: `Failed to delete association: ${response.statusText}` };
    }

    return "success";
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to delete association",
    };
  }
};

export const createEmptyAssociationData = (): AssociationData => ({
  tags: [],
  virtualKeys: [],
  matchOnPath: [],
});

export const createEmptyVirtualKeyAssociation = (
  deviceId: string,
): VirtualKeyAssociation => ({
  deviceId,
  deviceMatching: {
    inputKey: EMPTY_INPUT_KEY,
  },
  virtualKey: 0,
});

export const EMPTY_INPUT_KEY = "None";

// Input key options matching C# InputKey enum names
export const INPUT_KEY_GROUPS = [
  {
    label: "Mouse",
    options: [
      { value: "LeftButton", label: "Left Click" },
      { value: "RightButton", label: "Right Click" },
      { value: "MiddleButton", label: "Middle Click" },
      { value: "ExtraButton1", label: "Back (X1)" },
      { value: "ExtraButton2", label: "Forward (X2)" },
      { value: "ScrollUp", label: "Scroll Up" },
      { value: "ScrollDown", label: "Scroll Down" },
    ],
  },
  {
    label: "Modifiers",
    options: [
      { value: "Shift", label: "Shift" },
      { value: "Control", label: "Ctrl" },
      { value: "Menu", label: "Alt" },
      { value: "LeftShift", label: "Left Shift" },
      { value: "RightShift", label: "Right Shift" },
      { value: "LeftControl", label: "Left Ctrl" },
      { value: "RightControl", label: "Right Ctrl" },
      { value: "LeftAlt", label: "Left Alt" },
      { value: "RightAlt", label: "Right Alt" },
      { value: "LeftWindows", label: "Left Win" },
      { value: "RightWindows", label: "Right Win" },
      { value: "CapsLock", label: "Caps Lock" },
      { value: "NumLock", label: "Num Lock" },
      { value: "ScrollLock", label: "Scroll Lock" },
    ],
  },
  {
    label: "Letters",
    options: [
      { value: "A", label: "A" },
      { value: "B", label: "B" },
      { value: "C", label: "C" },
      { value: "D", label: "D" },
      { value: "E", label: "E" },
      { value: "F", label: "F" },
      { value: "G", label: "G" },
      { value: "H", label: "H" },
      { value: "I", label: "I" },
      { value: "J", label: "J" },
      { value: "K", label: "K" },
      { value: "L", label: "L" },
      { value: "M", label: "M" },
      { value: "N", label: "N" },
      { value: "O", label: "O" },
      { value: "P", label: "P" },
      { value: "Q", label: "Q" },
      { value: "R", label: "R" },
      { value: "S", label: "S" },
      { value: "T", label: "T" },
      { value: "U", label: "U" },
      { value: "V", label: "V" },
      { value: "W", label: "W" },
      { value: "X", label: "X" },
      { value: "Y", label: "Y" },
      { value: "Z", label: "Z" },
    ],
  },
  {
    label: "Numbers",
    options: [
      { value: "N0", label: "0" },
      { value: "N1", label: "1" },
      { value: "N2", label: "2" },
      { value: "N3", label: "3" },
      { value: "N4", label: "4" },
      { value: "N5", label: "5" },
      { value: "N6", label: "6" },
      { value: "N7", label: "7" },
      { value: "N8", label: "8" },
      { value: "N9", label: "9" },
    ],
  },
  {
    label: "Function Keys",
    options: [
      { value: "F1", label: "F1" },
      { value: "F2", label: "F2" },
      { value: "F3", label: "F3" },
      { value: "F4", label: "F4" },
      { value: "F5", label: "F5" },
      { value: "F6", label: "F6" },
      { value: "F7", label: "F7" },
      { value: "F8", label: "F8" },
      { value: "F9", label: "F9" },
      { value: "F10", label: "F10" },
      { value: "F11", label: "F11" },
      { value: "F12", label: "F12" },
      { value: "F13", label: "F13" },
      { value: "F14", label: "F14" },
      { value: "F15", label: "F15" },
      { value: "F16", label: "F16" },
      { value: "F17", label: "F17" },
      { value: "F18", label: "F18" },
      { value: "F19", label: "F19" },
      { value: "F20", label: "F20" },
      { value: "F21", label: "F21" },
      { value: "F22", label: "F22" },
      { value: "F23", label: "F23" },
      { value: "F24", label: "F24" },
    ],
  },
  {
    label: "Navigation",
    options: [
      { value: "Left", label: "Arrow Left" },
      { value: "Right", label: "Arrow Right" },
      { value: "Up", label: "Arrow Up" },
      { value: "Down", label: "Arrow Down" },
      { value: "Home", label: "Home" },
      { value: "End", label: "End" },
      { value: "Prior", label: "Page Up" },
      { value: "Next", label: "Page Down" },
      { value: "Insert", label: "Insert" },
      { value: "Delete", label: "Delete" },
    ],
  },
  {
    label: "Editing",
    options: [
      { value: "Return", label: "Enter" },
      { value: "Space", label: "Space" },
      { value: "Back", label: "Backspace" },
      { value: "Tab", label: "Tab" },
      { value: "Escape", label: "Escape" },
      { value: "Pause", label: "Pause" },
      { value: "Print", label: "Print" },
      { value: "PrintScreen", label: "Print Screen" },
      { value: "Application", label: "Context Menu" },
    ],
  },
  {
    label: "Numpad",
    options: [
      { value: "Numpad0", label: "Numpad 0" },
      { value: "Numpad1", label: "Numpad 1" },
      { value: "Numpad2", label: "Numpad 2" },
      { value: "Numpad3", label: "Numpad 3" },
      { value: "Numpad4", label: "Numpad 4" },
      { value: "Numpad5", label: "Numpad 5" },
      { value: "Numpad6", label: "Numpad 6" },
      { value: "Numpad7", label: "Numpad 7" },
      { value: "Numpad8", label: "Numpad 8" },
      { value: "Numpad9", label: "Numpad 9" },
      { value: "Multiply", label: "Numpad *" },
      { value: "Add", label: "Numpad +" },
      { value: "Subtract", label: "Numpad -" },
      { value: "Decimal", label: "Numpad ." },
      { value: "Divide", label: "Numpad /" },
    ],
  },
  {
    label: "Punctuation",
    options: [
      { value: "OEM1", label: "; :" },
      { value: "OEMPlus", label: "= +" },
      { value: "OEMComma", label: ", <" },
      { value: "OEMMinus", label: "- _" },
      { value: "OEMPeriod", label: ". >" },
      { value: "OEM2", label: "/ ?" },
      { value: "OEM3", label: "` ~" },
      { value: "OEM4", label: "[ {" },
      { value: "OEM5", label: "\\ |" },
      { value: "OEM6", label: "] }" },
      { value: "OEM7", label: "' \"" },
      { value: "OEM8", label: "OEM8" },
    ],
  },
  {
    label: "Media",
    options: [
      { value: "VolumeMute", label: "Mute" },
      { value: "VolumeDown", label: "Volume Down" },
      { value: "VolumeUp", label: "Volume Up" },
      { value: "MediaNextTrack", label: "Next Track" },
      { value: "MediaPrevTrack", label: "Prev Track" },
      { value: "MediaStop", label: "Stop" },
      { value: "MediaPlayPause", label: "Play/Pause" },
    ],
  },
] as const;

// Map from browser KeyboardEvent.code to InputKey value
export const KEY_CODE_TO_INPUT_KEY: Record<string, string> = {
  // Letters
  KeyA: "A",
  KeyB: "B",
  KeyC: "C",
  KeyD: "D",
  KeyE: "E",
  KeyF: "F",
  KeyG: "G",
  KeyH: "H",
  KeyI: "I",
  KeyJ: "J",
  KeyK: "K",
  KeyL: "L",
  KeyM: "M",
  KeyN: "N",
  KeyO: "O",
  KeyP: "P",
  KeyQ: "Q",
  KeyR: "R",
  KeyS: "S",
  KeyT: "T",
  KeyU: "U",
  KeyV: "V",
  KeyW: "W",
  KeyX: "X",
  KeyY: "Y",
  KeyZ: "Z",
  // Numbers
  Digit0: "N0",
  Digit1: "N1",
  Digit2: "N2",
  Digit3: "N3",
  Digit4: "N4",
  Digit5: "N5",
  Digit6: "N6",
  Digit7: "N7",
  Digit8: "N8",
  Digit9: "N9",
  // Function keys
  F1: "F1",
  F2: "F2",
  F3: "F3",
  F4: "F4",
  F5: "F5",
  F6: "F6",
  F7: "F7",
  F8: "F8",
  F9: "F9",
  F10: "F10",
  F11: "F11",
  F12: "F12",
  F13: "F13",
  F14: "F14",
  F15: "F15",
  F16: "F16",
  F17: "F17",
  F18: "F18",
  F19: "F19",
  F20: "F20",
  F21: "F21",
  F22: "F22",
  F23: "F23",
  F24: "F24",
  // Modifiers
  ShiftLeft: "LeftShift",
  ShiftRight: "RightShift",
  ControlLeft: "LeftControl",
  ControlRight: "RightControl",
  AltLeft: "LeftAlt",
  AltRight: "RightAlt",
  MetaLeft: "LeftWindows",
  MetaRight: "RightWindows",
  CapsLock: "CapsLock",
  NumLock: "NumLock",
  ScrollLock: "ScrollLock",
  // Navigation
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
  Home: "Home",
  End: "End",
  PageUp: "Prior",
  PageDown: "Next",
  Insert: "Insert",
  Delete: "Delete",
  // Editing
  Enter: "Return",
  Space: "Space",
  Backspace: "Back",
  Tab: "Tab",
  Escape: "Escape",
  Pause: "Pause",
  PrintScreen: "PrintScreen",
  ContextMenu: "Application",
  // Numpad
  Numpad0: "Numpad0",
  Numpad1: "Numpad1",
  Numpad2: "Numpad2",
  Numpad3: "Numpad3",
  Numpad4: "Numpad4",
  Numpad5: "Numpad5",
  Numpad6: "Numpad6",
  Numpad7: "Numpad7",
  Numpad8: "Numpad8",
  Numpad9: "Numpad9",
  NumpadMultiply: "Multiply",
  NumpadAdd: "Add",
  NumpadSubtract: "Subtract",
  NumpadDecimal: "Decimal",
  NumpadDivide: "Divide",
  // Punctuation
  Semicolon: "OEM1",
  Equal: "OEMPlus",
  Comma: "OEMComma",
  Minus: "OEMMinus",
  Period: "OEMPeriod",
  Slash: "OEM2",
  Backquote: "OEM3",
  BracketLeft: "OEM4",
  Backslash: "OEM5",
  BracketRight: "OEM6",
  Quote: "OEM7",
};

// Map from browser mouse button to InputKey value
export const MOUSE_BUTTON_TO_INPUT_KEY: Record<number, string> = {
  0: "LeftButton",
  1: "MiddleButton",
  2: "RightButton",
  3: "ExtraButton1",
  4: "ExtraButton2",
};

export const getInputKeyLabel = (value: string): string => {
  for (const group of INPUT_KEY_GROUPS) {
    const option = group.options.find((o) => o.value === value);
    if (option) return option.label;
  }
  return value;
};
