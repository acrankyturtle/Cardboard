import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  Ref,
} from "react";
import clsx from "clsx";
import * as React from "react";
import { VioletListItem } from "./ListItem.tsx";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface ListBoxItem {
  label: string;
  value: string;
}

interface ListBoxBaseProps<TItem extends ListBoxItem> {
  className?: string;
  items: readonly TItem[];
  renderItem?: (item: TItem, selected: boolean) => ReactNode;
  onDoubleClick?: (item: TItem) => void;
  sortable?: boolean;
  onReorder?: (items: TItem[]) => void;
  onDragActiveChange?: (active: boolean) => void;
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

interface SortableListItemProps<TItem extends ListBoxItem> {
  item: TItem;
  index: number;
  isSelected: boolean;
  itemRefs: React.RefObject<(HTMLLIElement | null)[]>;
  onClick: () => void;
  onContextMenu: () => void;
  onDoubleClick?: () => void;
  renderItem?: (item: TItem, selected: boolean) => ReactNode;
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
}: SortableListItemProps<TItem>) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.value });

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
      {renderItem ? (
        renderItem(item, isSelected)
      ) : (
        <VioletListItem selected={isSelected}>
          {item.label.length > 0 ? item.label : <EmptyListItem />}
        </VioletListItem>
      )}
    </li>
  );
}

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
    sortable,
    onReorder,
    onDragActiveChange,
  }: ListBoxProps<TItem>,
  ref: Ref<HTMLDivElement>,
) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const modifiers = useMemo(
    () => [restrictToVerticalAxis, restrictToParentElement],
    [],
  );

  const itemIds = useMemo(() => items.map((item) => item.value), [items]);

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

  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
    onDragActiveChange?.(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    onDragActiveChange?.(false);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.value === active.id);
      const newIndex = items.findIndex((item) => item.value === over.id);
      const reordered = arrayMove([...items], oldIndex, newIndex);
      onReorder?.(reordered);
    }
  };

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

      if (sortable) {
        return (
          <SortableListItem
            key={item.value}
            item={item}
            index={index}
            isSelected={isItemSelected}
            itemRefs={itemRefs}
            onClick={makeClickHandler(item, isItemSelected)}
            onContextMenu={makeContextMenuHandler(item, isItemSelected)}
            onDoubleClick={
              onDoubleClick ? () => onDoubleClick(item) : undefined
            }
            renderItem={renderItem}
          />
        );
      }

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

  const listContent = (
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
  );

  return (
    <div
      ref={ref}
      className={clsx("overflow-y-auto", className)}
      data-dragging={isDragging || undefined}
    >
      {sortable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={modifiers}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setIsDragging(false);
            onDragActiveChange?.(false);
          }}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            {listContent}
          </SortableContext>
        </DndContext>
      ) : (
        listContent
      )}
    </div>
  );
}

export const ListBox = forwardRef(ListBoxInner) as <TItem extends ListBoxItem>(
  props: ListBoxProps<TItem> & { ref?: Ref<HTMLDivElement> },
) => React.ReactElement | null;

export function EmptyListItem() {
  return <div className="text-stone-50/25">(empty)</div>;
}
