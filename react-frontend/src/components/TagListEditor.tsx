import { Input } from "@headlessui/react";
import clsx from "clsx";
import { useRef, useState } from "react";

export function TagListEditor({
  value,
  onChange,
  onEnterEmpty,
  className,
  autoFocus,
}: {
  value?: readonly string[];
  onChange?: (value: readonly string[]) => void;
  onEnterEmpty?: () => void;
  className?: string;
  autoFocus?: boolean;
}) {
  const tags = value ?? [];
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commitTag(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setInputValue("");
      return;
    }
    const updated = [...tags, trimmed].sort((a, b) => a.localeCompare(b));
    setInputValue("");
    onChange?.(updated);
  }

  function removeTag(tag: string) {
    onChange?.(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        commitTag(inputValue);
      } else {
        onEnterEmpty?.();
      }
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div
      className={clsx(
        "flex min-h-[2.5rem] cursor-text flex-wrap items-center gap-1.5 rounded-md border-1 border-stone-900 bg-stone-800 px-2 py-1.5 shadow-sm outline-0 focus-within:ring-1 focus-within:ring-violet-500",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-stone-700 px-2.5 py-0.5 text-sm text-stone-200"
        >
          {tag}
          <button
            type="button"
            className="ml-0.5 cursor-pointer text-stone-400 hover:text-stone-100"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 3l6 6M9 3l-6 6" />
            </svg>
          </button>
        </span>
      ))}
      <Input
        ref={inputRef}
        type="text"
        className="min-w-[4rem] flex-1 border-none bg-transparent outline-none"
        placeholder={tags.length === 0 ? "Add tag..." : ""}
        autoFocus={autoFocus}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            commitTag(inputValue);
          }
        }}
      />
    </div>
  );
}
