import { ReactNode, useEffect, useRef, forwardRef, Ref } from "react";
import clsx from "clsx";
import * as React from "react";
import { VioletListItem } from "./ListItem.tsx";

export interface ListBoxItem {
  label: string;
  value: string;
}

interface ListBoxBaseProps<TItem extends ListBoxItem> {
  className?: string;
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

function ListBoxInner<TItem extends ListBoxItem>(
  {
    className,
    items,
    selected,
    setSelected,
    onDoubleClick,
    onDelete,
    renderItem,
    isMultiSelect,
  }: ListBoxProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
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

  const makeClickHandler = (item: TItem, isItemSelected: boolean) => () => {
    if (isMultiSelect) {
      setSelected?.(
        isItemSelected
          ? selected.filter((x) => x.value !== item.value)
          : [...selected, item],
      );
    } else {
      setSelected?.(item);
    }
  };

  const makeContextMenuHandler =
    (item: TItem, isItemSelected: boolean) => () => {
      if (isMultiSelect) {
        if (!isItemSelected) {
          setSelected?.([item]);
        }
      } else {
        setSelected?.(item);
      }
    };

  const renderListItems = () =>
    items.map((item, index) => {
      const isItemSelected = isMultiSelect
        ? selected?.some((x) => x.value === item.value)
        : selected?.value === item.value;

      return (
        <li
          key={item.value}
          id={`item-${item.value}`}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          role="option"
          aria-selected={isItemSelected}
          onClick={makeClickHandler(item, isItemSelected)}
          onContextMenu={makeContextMenuHandler(item, isItemSelected)}
          onDoubleClick={() => onDoubleClick?.(item)}
          className="cursor-pointer"
        >
          {renderItem ? (
            renderItem(item, isItemSelected)
          ) : (
            <VioletListItem selected={isItemSelected}>
              {item.label.length > 0 ? item.label : <EmptyListItem />}
            </VioletListItem>
          )}
        </li>
      );
    });

  return (
    <div ref={ref} className={clsx("overflow-y-auto", className)}>
      <ul
        ref={listRef}
        role="listbox"
        aria-activedescendant={
          selected && !isMultiSelect ? `item-${selected.value}` : undefined
        }
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {renderListItems()}
      </ul>
    </div>
  );
}

export const ListBox = forwardRef(ListBoxInner) as <TItem extends ListBoxItem>(
  props: ListBoxProps<TItem> & { ref?: Ref<HTMLDivElement> },
) => React.ReactElement | null;

export function EmptyListItem() {
  return <div className="text-stone-50/25">(empty)</div>;
}
