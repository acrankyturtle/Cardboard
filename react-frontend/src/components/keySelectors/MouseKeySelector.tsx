import { MouseButton } from "../../api/devices.ts";
import { Selector, SelectorItem } from "./Selector.tsx";

export function MouseKeySelector({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: MouseButton;
  onChange?: (value: MouseButton) => void;
}) {
  return (
    <Selector
      className={className}
      items={Object.values(MouseButton).map(
        (v): SelectorItem<MouseButton> => ({
          label: getMouseButtonLabel(v),
          value: v,
        }),
      )}
      selected={{ label: getMouseButtonLabel(value), value }}
      onChange={onChange}
    />
  );
}

const getMouseButtonLabel = (button: MouseButton): string => {
  switch (button) {
    case MouseButton.Left:
      return "Left";
    case MouseButton.Right:
      return "Right";
    case MouseButton.Middle:
      return "Middle";
    case MouseButton.Back:
      return "Back";
    case MouseButton.Forward:
      return "Forward";
  }
};
