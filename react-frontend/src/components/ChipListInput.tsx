import { Input } from "@headlessui/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { Button } from "@root/react-frontend/src/components/Button.tsx";
import { ThickRemoveIcon } from "@root/react-frontend/src/assets/sharedIcons.tsx";
import { InputClassName } from "@root/react-frontend/src/components/Input.tsx";

export function ChipListInput<T>({
  value,
  onChange,
  className,
  autoFocus,
  placeholder = "Add item...",
  layout = "inline",
  parseItem,
  formatItem = String as (item: T) => string,
  getItemKey = String as (item: T) => string,
  sortItem,
}: {
  value?: readonly T[];
  onChange?: (value: readonly T[]) => void;
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
  layout?: "inline" | "stacked";
  parseItem?: (text: string) => T | undefined;
  formatItem?: (item: T) => string;
  getItemKey?: (item: T) => string;
  sortItem?: (a: T, b: T) => number;
}) {
  const items = value ?? [];
  const [inputValue, setInputValue] = useState("");
  const [cursorIndex, setCursorIndex] = useState(items.length);
  const inputRef = useRef<HTMLInputElement>(null);

  const parse = parseItem ?? defaultParseItem;
  const sort = sortItem ?? defaultSortItems;

  useEffect(
    () => setCursorIndex((prev) => Math.min(prev, items.length)),
    [items.length],
  );

  const navigating = cursorIndex < items.length;

  useEffect(() => {
    // refocus after the input moves position in the DOM
    if (navigating) {
      inputRef.current?.focus();
    }
  }, [cursorIndex, navigating]);

  function commitItem(text: string) {
    const parsed = parse(text.trim());
    if (parsed === undefined || items.includes(parsed)) {
      setInputValue("");
      return;
    }
    const updated = [...items, parsed];
    setInputValue("");
    setCursorIndex(updated.length);
    onChange?.(updated);
  }

  function removeItem(item: T) {
    onChange?.(items.filter((t) => t !== item));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (inputValue.trim()) {
        e.preventDefault();
        commitItem(inputValue);
      }
    } else if (e.key == "Escape" && inputValue.trim().length > 0) {
      e.preventDefault();
      setInputValue("");
    } else if (e.key === "ArrowLeft" && inputValue === "") {
      e.preventDefault();
      setCursorIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "ArrowRight" && cursorIndex < items.length) {
      e.preventDefault();
      setCursorIndex((prev) => Math.min(items.length, prev + 1));
    } else if (e.key === "Backspace" && inputValue === "" && items.length > 0) {
      if (cursorIndex > 0) {
        const removeIdx = cursorIndex - 1;
        setCursorIndex(removeIdx);
        onChange?.(items.filter((_, i) => i !== removeIdx));
      }
    } else if (
      e.key === "Delete" &&
      inputValue === "" &&
      cursorIndex < items.length
    ) {
      onChange?.(items.filter((_, i) => i !== cursorIndex));
    } else if (e.key === "Escape") {
      setCursorIndex(items.length);
    } else if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      cursorIndex < items.length
    ) {
      setCursorIndex(items.length);
    }
  }

  function handleBlur(e: React.FocusEvent) {
    // ignore blur if focus stays within the container (input repositioning)
    if (
      e.currentTarget.closest("[data-chip-list]")?.contains(e.relatedTarget)
    ) {
      return;
    }
    setCursorIndex(items.length);
    if (inputValue.trim()) {
      commitItem(inputValue);
    }
    // sort on blur
    if (items.length > 1) {
      const sorted = [...items].sort(sort);
      if (sorted.some((s, i) => s !== items[i])) {
        onChange?.(sorted);
      }
    }
  }

  const stacked = layout === "stacked";

  return (
    <div
      data-chip-list
      className={clsx(
        "min-h-[2.5rem] cursor-text",
        stacked ? "flex flex-col gap-1" : "flex flex-wrap items-center gap-1.5",
        InputClassName,
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {(() => {
        const inputEl = (
          <Input
            key="__input"
            ref={inputRef}
            type="text"
            className={clsx("border-none bg-transparent outline-none", {
              "w-px min-w-0 p-0": navigating,
              "min-w-[4rem] flex-1": !navigating,
              "mt-auto": stacked && !navigating,
            })}
            placeholder={!navigating && items.length === 0 ? placeholder : ""}
            autoFocus={autoFocus}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setCursorIndex(items.length);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        );

        const elements: React.ReactNode[] = [];
        for (let i = 0; i < items.length; i++) {
          if (cursorIndex === i) elements.push(inputEl);
          const item = items[i];
          elements.push(
            <span
              key={getItemKey(item)}
              className={clsx(
                "flex items-center gap-1 rounded-full bg-stone-700 px-2.5 py-0.5 text-sm text-stone-200",
                { "self-start": stacked },
              )}
            >
              {formatItem(item)}
              <Button
                className="ml-0.5"
                buttonStyle={{ variant: "dim-ghost", padding: "none" }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item);
                }}
              >
                <ThickRemoveIcon className="h-3 w-3" />
              </Button>
            </span>,
          );
        }
        if (cursorIndex >= items.length) elements.push(inputEl);
        return elements;
      })()}
    </div>
  );
}

const defaultParseItem = <T,>(text: string): T | undefined => {
  const trimmed = text.trim();
  return trimmed ? (trimmed as T) : undefined;
};
const defaultSortItems = <T,>(a: T, b: T): number =>
  String(a).localeCompare(String(b));
