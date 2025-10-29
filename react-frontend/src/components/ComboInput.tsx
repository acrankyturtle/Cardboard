import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { ReactNode, useMemo, useState } from "react";
import { getButtonClassName } from "./Button.tsx";
import clsx from "clsx";

export interface ComboInputItem {
  id: string;
  name: string;
}

export function ComboInput<TItem extends ComboInputItem>({
  className,
  value,
  onChange,
  items,
  itemFromQuery,
  renderOption,
}: {
  className?: string;
  value: TItem;
  onChange: (value: TItem) => void;
  items: readonly TItem[];
  renderOption?: (item: TItem) => ReactNode;
  itemFromQuery?: (query: string) => TItem | undefined;
}) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(
    () =>
      query.length > 0
        ? items.filter((x) =>
            x.name.toLowerCase().includes(query.toLowerCase()),
          )
        : items,
    [items, query],
  );

  const newItem = query.length > 0 ? itemFromQuery?.(query) : undefined;

  return (
    <Combobox as="div" className="" value={value} onChange={onChange}>
      <div className="relative">
        <ComboboxInput
          className={clsx("", className)}
          displayValue={(item: TItem) => item?.name}
          onChange={(event) => {
            if (!itemFromQuery) return;
            setQuery(event.target.value);
          }}
        />
      </div>
      <ComboboxButton
        as="button"
        className={clsx("-p-2 size-6", getButtonClassName({}))}
      >
        <svg
          className="-m-2"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M6 9l6 6l6 -6" />
        </svg>
      </ComboboxButton>
      <ComboboxOptions
        as="div"
        anchor="bottom"
        className="[--anchor-gap:--spacing(1)]"
      >
        {[...(newItem ? [newItem] : []), ...filteredItems].map((x) => (
          <ComboboxOption
            key={x.id}
            value={x}
            className="bg-stone-800 data-selected:bg-amber-600"
          >
            {renderOption ? renderOption(x) : x.name}
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  );
}
