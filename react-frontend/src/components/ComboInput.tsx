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
  noItemsMessage,
  renderOption,
  variant = "default",
}: {
  className?: string;
  value: TItem;
  onChange: (value: TItem) => void;
  items: readonly TItem[];
  renderOption?: (item: TItem) => ReactNode;
  itemFromQuery?: (query: string) => TItem | undefined;
  noItemsMessage?: string;
  variant?: "default" | "compact";
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
      className={clsx("relative", variant === "default" ? "flex grow" : "min-w-0 grow")}
      value={value}
      onChange={onChange}
    >
      <ComboboxInput
        className={clsx(
          variant === "compact"
            ? "w-full rounded-xl bg-stone-800 py-1 pl-2 pr-6 text-sm text-stone-100 shadow-sm outline-0 focus:border-stone-600 focus:ring-1 focus:ring-stone-500 data-hover:bg-stone-900"
            : "",
          className,
        )}
        displayValue={(item: TItem) => item?.name}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ComboboxButton
        as="button"
        className={
          variant === "compact"
            ? "absolute inset-y-0 right-0 flex w-6 items-center justify-center text-stone-400 hover:text-stone-200"
            : clsx("-ml-7 size-6 self-center", getButtonClassName({}))
        }
      >
        <svg
          className={variant === "compact" ? "size-4" : "-m-2"}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={variant === "compact" ? "2" : "1.25"}
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
        {(() => {
          const allItems = [...(newItem ? [newItem] : []), ...filteredItems];
          return allItems.length === 0 && noItemsMessage ? (
            <div className="px-2 py-1 text-stone-400 italic">
              {noItemsMessage}
            </div>
          ) : (
            allItems.map((x) => (
              <ComboboxOption
                key={x.id}
                value={x}
                className="cursor-pointer px-2 py-1 data-focus:bg-amber-600"
                data-combobox-options
              >
                {renderOption ? renderOption(x) : x.name}
              </ComboboxOption>
            ))
          );
        })()}
      </ComboboxOptions>
    </Combobox>
  );
}
