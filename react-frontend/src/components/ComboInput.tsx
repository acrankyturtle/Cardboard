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
    <Combobox
      as="div"
      className="relative flex grow"
      value={value}
      onChange={onChange}
    >
      <ComboboxInput
        className={clsx("", className)}
        displayValue={(item: TItem) => item?.name}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ComboboxButton
        as="button"
        className={clsx("-ml-7 size-6 self-center", getButtonClassName({}))}
      >
        <svg
          className="-m-2"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6l6 -6" />
        </svg>
      </ComboboxButton>
      <ComboboxOptions
        anchor="bottom start"
        className="z-50 w-[var(--input-width)] rounded border border-stone-600 bg-stone-800 py-1 text-stone-100 shadow-lg [--anchor-gap:--spacing(1)]"
      >
        {[...(newItem ? [newItem] : []), ...filteredItems].map((x) => (
          <ComboboxOption
            key={x.id}
            value={x}
            className="cursor-pointer px-2 py-1 data-focus:bg-amber-600"
            data-combobox-options
          >
            {renderOption ? renderOption(x) : x.name}
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  );
}
