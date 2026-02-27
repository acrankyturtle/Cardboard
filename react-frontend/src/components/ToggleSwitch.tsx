import { Checkbox } from "@headlessui/react";
import clsx from "clsx";

export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      className={clsx(
        "group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-stone-900 focus:outline-none",
        checked ? "bg-violet-600" : "bg-stone-600",
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </Checkbox>
  );
}
