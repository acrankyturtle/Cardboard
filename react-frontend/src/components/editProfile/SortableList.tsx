import { ReactNode, useEffect, useMemo, useRef } from "react";
import * as React from "react";
import clsx from "clsx";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListBoxItem } from "../ListBox.tsx";

interface SortableListProps<TItem extends ListBoxItem> {
  className?: string;
  items: readonly TItem[];
  selected?: TItem | null;
  setSelected?: (item: TItem) => void;
  onDoubleClick?: (item: TItem) => void;
  renderItem: (item: TItem, selected: boolean, isOver: boolean) => ReactNode;
  sortableData?: (item: TItem) => Record<string, unknown>;
}

function SortableListItem<TItem extends ListBoxItem>({
  item,
  index,
  isSelected,
  itemRefs,
  onClick,
  onContextMenu,
  onDoubleClick,
  renderItem,
  sortableData,
}: {
  item: TItem;
  index: number;
  isSelected: boolean;
  itemRefs: React.RefObject<(HTMLLIElement | null)[]>;
  onClick: () => void;
  onContextMenu: () => void;
  onDoubleClick?: () => void;
  renderItem: (item: TItem, selected: boolean, isOver: boolean) => ReactNode;
  sortableData?: Record<string, unknown>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isOver,
  } = useSortable({ id: item.value, data: sortableData });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        itemRefs.current![index] = el;
      }}
      id={`item-${item.value}`}
      aria-selected={isSelected}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      className="cursor-pointer"
      style={style}
      {...attributes}
      {...listeners}
    >
      {renderItem(item, isSelected, isOver)}
    </li>
  );
}

export function SortableList<TItem extends ListBoxItem>({
  className,
  items,
  selected,
  setSelected,
  onDoubleClick,
  renderItem,
  sortableData,
}: SortableListProps<TItem>) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const itemIds = useMemo(() => items.map((item) => item.value), [items]);

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
    }

    if (newIndex >= 0 && newIndex < items.length) {
      setSelected?.(items[newIndex]);
      itemRefs.current[newIndex]?.focus();
    }
  };

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
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul
          ref={listRef}
          role="listbox"
          aria-activedescendant={
            selected ? `item-${selected.value}` : undefined
          }
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {items.map((item, index) => {
            const isItemSelected = selected?.value === item.value;
            return (
              <SortableListItem
                key={item.value}
                item={item}
                index={index}
                isSelected={isItemSelected}
                itemRefs={itemRefs}
                onClick={() => setSelected?.(item)}
                onContextMenu={() => setSelected?.(item)}
                onDoubleClick={
                  onDoubleClick ? () => onDoubleClick(item) : undefined
                }
                renderItem={renderItem}
                sortableData={sortableData?.(item)}
              />
            );
          })}
        </ul>
      </SortableContext>
    </div>
  );
}
