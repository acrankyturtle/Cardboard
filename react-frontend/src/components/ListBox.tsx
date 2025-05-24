import { useEffect, useRef } from "react";
import clsx, { ClassValue } from "clsx";

export interface ListBoxItem {
  label: string;
  value: string;
}

export function ListBox<TItem extends ListBoxItem>({
  className,
  variant,
  items,
  selected,
  setSelected,
  onEdit,
}: {
  className?: string;
  variant?: ItemVariant;
  items: readonly TItem[];
  selected?: TItem | null;
  setSelected?: (item: TItem) => void;
  onEdit?: (item: TItem) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (!listRef.current) return;

    const currentIndex = selected
      ? items.findIndex((item) => item.value === selected.value)
      : -1;

    let newIndex = currentIndex;

    if (event.key === "ArrowDown") {
      newIndex = Math.min(currentIndex + 1, items.length - 1);
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      newIndex = Math.max(currentIndex - 1, 0);
      event.preventDefault();
    } else if (event.key === "Enter" && currentIndex >= 0) {
      setSelected?.(items[currentIndex]);
      event.preventDefault();
    }

    if (newIndex >= 0 && newIndex < items.length) {
      setSelected?.(items[newIndex]);
      itemRefs.current[newIndex]?.focus();
    }
  };

  // Ensure selected item is in view
  useEffect(() => {
    const selectedIndex = selected
      ? items.findIndex((item) => item.value === selected.value)
      : -1;
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  return (
    <div className={clsx("overflow-y-auto", className)}>
      <ul
        ref={listRef}
        role="listbox"
        aria-activedescendant={selected ? `item-${selected}` : undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        {items.map((item, index) => (
          <li
            key={item.value}
            id={`item-${item.value}`}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="option"
            aria-selected={selected?.value === item.value}
            onClick={() => setSelected?.(item)}
            onDoubleClick={() => onEdit?.(item)}
            className={clsx(
              "cursor-pointer px-4 py-2 transition-colors duration-150 select-none",
              getVariantStyle(
                variant ?? "violet",
                selected?.value === item.value,
              ),
            )}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

type ItemVariant = "violet" | "yellow" | "red" | "green" | "blue";

const getVariantStyle = (
  variant: ItemVariant,
  selected: boolean,
): ClassValue => {
  switch (variant) {
    case "violet":
      return {
        "bg-violet-900 hover:bg-violet-800": selected,
        "hover:bg-stone-700 active:bg-violet-900/50 active:not-hover:bg-stone-900":
          !selected,
      };
    case "yellow":
      return {
        "bg-yellow-900 hover:bg-yellow-800": selected,
        "hover:bg-stone-700 active:bg-yellow-900/50 active:not-hover:bg-stone-900":
          !selected,
      };
    case "red":
      return {
        "bg-red-900 hover:bg-red-800": selected,
        "hover:bg-stone-700 active:bg-red-900/50 active:not-hover:bg-stone-900":
          !selected,
      };
    case "green":
      return {
        "bg-lime-900 hover:bg-lime-800": selected,
        "hover:bg-stone-700 active:bg-lime-900/50 active:not-hover:bg-stone-900":
          !selected,
      };
    case "blue":
      return {
        "bg-blue-900 hover:bg-blue-800": selected,
        "hover:bg-stone-700 active:bg-blue-900/50 active:not-hover:bg-stone-900":
          !selected,
      };
  }
};
