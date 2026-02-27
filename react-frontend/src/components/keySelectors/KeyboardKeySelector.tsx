import { KeyboardKey } from "../../api/devices.ts";
import { Selector, SelectorItem } from "./Selector.tsx";

export function KeyboardKeySelector({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: KeyboardKey;
  onChange?: (value: KeyboardKey) => void;
}) {
  return (
    <Selector
      className={className}
      items={Object.values(KeyboardKey).map(
        (v): SelectorItem<KeyboardKey> => ({
          label: getKeyboardKeyLabel(v),
          value: v,
        }),
      )}
      selected={{ label: getKeyboardKeyLabel(value), value }}
      onChange={onChange}
    />
  );
}

const getKeyboardKeyLabel = (key: KeyboardKey): string => {
  switch (key) {
    case KeyboardKey.A:
      return "A";
    case KeyboardKey.B:
      return "B";
    case KeyboardKey.C:
      return "C";
    case KeyboardKey.D:
      return "D";
    case KeyboardKey.E:
      return "E";
    case KeyboardKey.F:
      return "F";
    case KeyboardKey.G:
      return "G";
    case KeyboardKey.H:
      return "H";
    case KeyboardKey.I:
      return "I";
    case KeyboardKey.J:
      return "J";
    case KeyboardKey.K:
      return "K";
    case KeyboardKey.L:
      return "L";
    case KeyboardKey.M:
      return "M";
    case KeyboardKey.N:
      return "N";
    case KeyboardKey.O:
      return "O";
    case KeyboardKey.P:
      return "P";
    case KeyboardKey.Q:
      return "Q";
    case KeyboardKey.R:
      return "R";
    case KeyboardKey.S:
      return "S";
    case KeyboardKey.T:
      return "T";
    case KeyboardKey.U:
      return "U";
    case KeyboardKey.V:
      return "V";
    case KeyboardKey.W:
      return "W";
    case KeyboardKey.X:
      return "X";
    case KeyboardKey.Y:
      return "Y";
    case KeyboardKey.Z:
      return "Z";
    case KeyboardKey.ONE:
      return "1";
    case KeyboardKey.TWO:
      return "2";
    case KeyboardKey.THREE:
      return "3";
    case KeyboardKey.FOUR:
      return "4";
    case KeyboardKey.FIVE:
      return "5";
    case KeyboardKey.SIX:
      return "6";
    case KeyboardKey.SEVEN:
      return "7";
    case KeyboardKey.EIGHT:
      return "8";
    case KeyboardKey.NINE:
      return "9";
    case KeyboardKey.ZERO:
      return "0";
    case KeyboardKey.ENTER:
      return "Enter";
    case KeyboardKey.ESCAPE:
      return "Escape";
    case KeyboardKey.BACKSPACE:
      return "Backspace";
    case KeyboardKey.TAB:
      return "Tab";
    case KeyboardKey.SPACEBAR:
      return "Space Bar";
    case KeyboardKey.MINUS:
      return "-";
    case KeyboardKey.EQUALS:
      return "=";
    case KeyboardKey.LEFT_BRACKET:
      return "[";
    case KeyboardKey.RIGHT_BRACKET:
      return "]";
    case KeyboardKey.BACKSLASH:
      return "\\";
    case KeyboardKey.POUND:
      return "Pound";
    case KeyboardKey.SEMICOLON:
      return ";";
    case KeyboardKey.QUOTE:
      return "'";
    case KeyboardKey.GRAVE_ACCENT:
      return "`";
    case KeyboardKey.COMMA:
      return ",";
    case KeyboardKey.PERIOD:
      return ".";
    case KeyboardKey.FORWARD_SLASH:
      return "/";
    case KeyboardKey.CAPS_LOCK:
      return "Caps Lock";
    case KeyboardKey.F1:
      return "F1";
    case KeyboardKey.F2:
      return "F2";
    case KeyboardKey.F3:
      return "F3";
    case KeyboardKey.F4:
      return "F4";
    case KeyboardKey.F5:
      return "F5";
    case KeyboardKey.F6:
      return "F6";
    case KeyboardKey.F7:
      return "F7";
    case KeyboardKey.F8:
      return "F8";
    case KeyboardKey.F9:
      return "F9";
    case KeyboardKey.F10:
      return "F10";
    case KeyboardKey.F11:
      return "F11";
    case KeyboardKey.F12:
      return "F12";
    case KeyboardKey.PRINT_SCREEN:
      return "Print Screen";
    case KeyboardKey.SCROLL_LOCK:
      return "Scroll Lock";
    case KeyboardKey.PAUSE:
      return "Pause";
    case KeyboardKey.INSERT:
      return "Insert";
    case KeyboardKey.HOME:
      return "Home";
    case KeyboardKey.PAGE_UP:
      return "Page Up";
    case KeyboardKey.DELETE:
      return "Delete";
    case KeyboardKey.END:
      return "End";
    case KeyboardKey.PAGE_DOWN:
      return "Page Down";
    case KeyboardKey.RIGHT_ARROW:
      return "Right Arrow";
    case KeyboardKey.LEFT_ARROW:
      return "Left Arrow";
    case KeyboardKey.DOWN_ARROW:
      return "Down Arrow";
    case KeyboardKey.UP_ARROW:
      return "Up Arrow";
    case KeyboardKey.KEYPAD_NUMLOCK:
      return "Keypad Numlock";
    case KeyboardKey.KEYPAD_FORWARD_SLASH:
      return "Keypad /";
    case KeyboardKey.KEYPAD_ASTERISK:
      return "Keypad *";
    case KeyboardKey.KEYPAD_MINUS:
      return "Keypad -";
    case KeyboardKey.KEYPAD_PLUS:
      return "Keypad +";
    case KeyboardKey.KEYPAD_ENTER:
      return "Keypad Enter";
    case KeyboardKey.KEYPAD_ONE:
      return "Keypad 1";
    case KeyboardKey.KEYPAD_TWO:
      return "Keypad 2";
    case KeyboardKey.KEYPAD_THREE:
      return "Keypad 3";
    case KeyboardKey.KEYPAD_FOUR:
      return "Keypad 4";
    case KeyboardKey.KEYPAD_FIVE:
      return "Keypad 5";
    case KeyboardKey.KEYPAD_SIX:
      return "Keypad 6";
    case KeyboardKey.KEYPAD_SEVEN:
      return "Keypad 7";
    case KeyboardKey.KEYPAD_EIGHT:
      return "Keypad 8";
    case KeyboardKey.KEYPAD_NINE:
      return "Keypad 9";
    case KeyboardKey.KEYPAD_ZERO:
      return "Keypad 0";
    case KeyboardKey.KEYPAD_PERIOD:
      return "Keypad .";
    case KeyboardKey.KEYPAD_BACKSLASH:
      return "Keypad \\";
    case KeyboardKey.APPLICATION:
      return "Application";
    case KeyboardKey.KEYPAD_EQUALS:
      return "Keypad =";
    case KeyboardKey.F13:
      return "F13";
    case KeyboardKey.F14:
      return "F14";
    case KeyboardKey.F15:
      return "F15";
    case KeyboardKey.F16:
      return "F16";
    case KeyboardKey.F17:
      return "F17";
    case KeyboardKey.F18:
      return "F18";
    case KeyboardKey.F19:
      return "F19";
    case KeyboardKey.F20:
      return "F20";
    case KeyboardKey.F21:
      return "F21";
    case KeyboardKey.F22:
      return "F22";
    case KeyboardKey.F23:
      return "F23";
    case KeyboardKey.F24:
      return "F24";
    case KeyboardKey.MENU:
      return "Menu";
    case KeyboardKey.LEFT_CONTROL:
      return "Left Control";
    case KeyboardKey.LEFT_SHIFT:
      return "Left Shift";
    case KeyboardKey.LEFT_ALT:
      return "Left Alt";
    case KeyboardKey.LEFT_GUI:
      return "Left GUI";
    case KeyboardKey.RIGHT_CONTROL:
      return "Right Control";
    case KeyboardKey.RIGHT_SHIFT:
      return "Right Shift";
    case KeyboardKey.RIGHT_ALT:
      return "Right Alt";
    case KeyboardKey.RIGHT_GUI:
      return "Right GUI";
  }
};
