import clsx from "clsx";
import { Textarea } from "@headlessui/react";
import { useEffect, useState } from "react";
import { InputClassName } from "./Input.tsx";

export function TagListEditor({
  value,
  onChange,
  className,
  autoFocus,
}: {
  value?: readonly string[];
  onChange?: (value: readonly string[]) => void;
  className?: string;
  autoFocus?: boolean;
}) {
  const [textValue, setTextValue] = useState("");

  useEffect(() => {
    setTextValue(value?.join("\n") ?? "");
  }, [value]);

  return (
    <Textarea
      className={clsx("h-24 px-2 py-2", InputClassName, className)}
      autoFocus={autoFocus}
      value={textValue}
      onChange={(e) => setTextValue(e.target.value)}
      onBlur={(e) =>
        onChange?.(
          e.target.value
            .split("\n")
            .map((t) => t.trim())
            .filter((t) => t) // filter empty
            .sort((a, b) => a.localeCompare(b)),
        )
      }
    />
  );
}
