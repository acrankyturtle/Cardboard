import { ReactNode, useEffect, useRef } from "react";
import clsx, { ClassValue } from "clsx";
import * as React from "react";

export interface ListBoxItem {
  label: string;
  value: string;
}

interface ListBoxBaseProps<TItem extends ListBoxItem> {
  className?: string;
  variant?: ItemVariant;
  items: readonly TItem[];
  renderItem?: (item: TItem, selected: boolean) => ReactNode;
  onDoubleClick?: (item: TItem) => void;
}

type ListBoxSingleSelectProps<TItem extends ListBoxItem> =
  ListBoxBaseProps<TItem> & {
    selected?: TItem | null;
    setSelected?: (item: TItem) => void;
    onDelete?: (item: TItem) => void;
  };

type ListBoxMultiSelectProps<TItem extends ListBoxItem> =
  ListBoxBaseProps<TItem> & {
    selected: readonly TItem[];
    setSelected: (items: readonly TItem[]) => void;
    onDelete?: (items: readonly TItem[]) => void;
  };

type ListBoxProps<TItem extends ListBoxItem> =
  | ({ isMultiSelect?: false } & ListBoxSingleSelectProps<TItem>)
  | ({ isMultiSelect: true } & ListBoxMultiSelectProps<TItem>);

export function ListBox<TItem extends ListBoxItem>({
  className,
  variant,
  items,
  selected,
  setSelected,
  onDoubleClick,
  onDelete,
  renderItem,
  isMultiSelect,
}: ListBoxProps<TItem>) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (isMultiSelect) return; // unsupported as of now
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
    if (isMultiSelect) return; // unsupported as of now

    const selectedIndex = selected
      ? items.findIndex((item) => item.value === selected.value)
      : -1;
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  // handle delete key
  useEffect(() => {
    if (!onDelete) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete") {
        if (isMultiSelect) {
          if (selected.length > 0) {
            onDelete(selected);
          }
        } else {
          if (selected) {
            onDelete(selected);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDelete, selected, isMultiSelect]);

  return (
    <div className={clsx("overflow-y-auto", className)}>
      <ul
        ref={listRef}
        role="listbox"
        aria-activedescendant={selected ? `item-${selected}` : undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {items.map((item, index) => {
          const isSelected = isMultiSelect
            ? selected?.some((x) => x.value == item.value)
            : selected?.value === item.value;
          return (
            <li
              key={item.value}
              id={`item-${item.value}`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                if (isMultiSelect) {
                  setSelected?.(
                    isSelected
                      ? selected.filter((x) => x.value !== item.value)
                      : [...selected, item],
                  );
                } else {
                  setSelected?.(item);
                }
              }}
              onDoubleClick={() => onDoubleClick?.(item)}
              className={clsx(
                "cursor-pointer px-4 py-2 transition-colors duration-150 select-none",
                getVariantStyle(variant ?? "violet", isSelected),
              )}
            >
              {renderItem ? (
                renderItem(item, isSelected)
              ) : item.label.length > 0 ? (
                item.label
              ) : (
                <div className="text-stone-50/25">(empty)</div>
              )}
            </li>
          );
        })}
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
