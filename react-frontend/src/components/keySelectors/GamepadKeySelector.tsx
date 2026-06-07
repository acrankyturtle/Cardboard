import { GamepadAxis, GamepadButton } from "../../api/devices.ts";
import { Selector, SelectorItem } from "./Selector.tsx";

export function GamepadKeySelector({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: GamepadButton;
  onChange?: (value: GamepadButton) => void;
}) {
  return (
    <Selector
      className={className}
      items={Object.values(GamepadButton).map(
        (v): SelectorItem<GamepadButton> => ({
          label: getGamepadButtonLabel(v),
          value: v,
        }),
      )}
      selected={{ label: getGamepadButtonLabel(value), value }}
      onChange={onChange}
    />
  );
}

export function GamepadAxisSelector({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: GamepadAxis;
  onChange?: (value: GamepadAxis) => void;
}) {
  return (
    <Selector
      className={className}
      items={Object.values(GamepadAxis).map(
        (v): SelectorItem<GamepadAxis> => ({
          label: getGamepadAxisLabel(v),
          value: v,
        }),
      )}
      selected={{ label: getGamepadAxisLabel(value), value }}
      onChange={onChange}
    />
  );
}

const getGamepadButtonLabel = (button: GamepadButton): string =>
  button.replace(/^Button/, "Button ");

const getGamepadAxisLabel = (axis: GamepadAxis): string => {
  switch (axis) {
    case GamepadAxis.LeftX:
      return "LS X";
    case GamepadAxis.LeftY:
      return "LS Y";
    case GamepadAxis.RightX:
      return "RS X";
    case GamepadAxis.RightY:
      return "RS Y";
    case GamepadAxis.LeftTrigger:
      return "LT";
    case GamepadAxis.RightTrigger:
      return "RT";
  }
};
