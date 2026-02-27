import { Select, SelectOption } from "../SelectBox.tsx";
import clsx from "clsx";
import { ReactNode } from "react";

export interface SelectorItem<T> {
  label: ReactNode;
  value: T;
}

export function Selector<T extends string>({
  className,
  items,
  selected,
  onChange,
}: {
  className?: string;
  items: readonly SelectorItem<T>[];
  selected: SelectorItem<T>;
  onChange?: (value: T) => void;
}) {
  return onChange ? (
    <div
      className={clsx(
        "flex grow items-center gap-1 overflow-hidden p-[1px] select-none",
        className,
      )}
    >
      <Select
        className="min-w-0 grow"
        dark
        value={selected.value}
        onChange={(s) => onChange(s.target.value as T)}
      >
        {items.map((item) => (
          <SelectOption
            key={item.value}
            value={item.value}
            selected={selected.value === item.value}
          >
            {item.label}
          </SelectOption>
        ))}
      </Select>
      {/*<Button // TODO*/}
      {/*  className="px-1 py-1.5 text-xs"*/}
      {/*  buttonStyle={{ padding: "none" }}*/}
      {/*>*/}
      {/*  Bind*/}
      {/*</Button>*/}
    </div>
  ) : (
    <div className="truncate">{selected.label}</div>
  );
}
