import Header from "../components/Header.tsx";
import { useLogs, clearLogs, LogEntry, LogLevel } from "../api/logs.ts";
import { Button } from "../components/Button.tsx";
import {
  DelayedLoadingIndicator,
  LargeLoadingIndicator,
} from "../components/LoadingIndicator.tsx";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import clsx from "clsx";
import { useMemo, useState } from "react";

const LOG_LEVELS: readonly LogLevel[] = [
  "Trace",
  "Debug",
  "Information",
  "Warning",
  "Error",
  "Critical",
];

type SortOrder = "asc" | "desc";

export function LogsIndex() {
  const { entries, isLoading, mutate, error } = useLogs(2000);
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
    new Set(LOG_LEVELS),
  );
  const [selectedCategories, setSelectedCategories] = useState<
    Set<string> | "all"
  >("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const allCategories = useMemo(() => {
    const categories = new Set(entries.map((e) => e.category));
    return Array.from(categories).sort();
  }, [entries]);

  const handleClear = async () => {
    await clearLogs();
    mutate();
  };

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev === "all") {
        const next = new Set(allCategories);
        next.delete(category);
        return next;
      }
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const selectAllLevels = () => setSelectedLevels(new Set(LOG_LEVELS));
  const clearAllLevels = () => setSelectedLevels(new Set<LogLevel>());

  const selectAllCategories = () => setSelectedCategories("all");
  const clearAllCategories = () => setSelectedCategories(new Set());

  const filteredAndSortedEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (!selectedLevels.has(entry.level)) return false;
      if (
        selectedCategories !== "all" &&
        !selectedCategories.has(entry.category)
      )
        return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [entries, selectedLevels, selectedCategories, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="flex size-full flex-col">
      <Header className="flex items-center justify-between">
        <div>Logs</div>
        <Button className="px-4" onClick={handleClear}>
          Clear
        </Button>
      </Header>
      <div className="grow overflow-y-auto p-4">
        {isLoading ? (
          <DelayedLoadingIndicator
            delayMs={250}
            renderLoading={() => <LargeLoadingIndicator className="m-2" />}
            renderWait={() => <></>}
          />
        ) : error != undefined ? (
          entries.length === 0 ? (
            <div className="text-stone-400">No log entries</div>
          ) : (
            <div className="flex gap-1">
              <div className="text-red-500">Error loading logs:</div>
              <div className="whitespace-pre-wrap text-red-500">
                {error.message}
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-[auto_auto_auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
            <ColumnHeader
              onClick={toggleSortOrder}
              className="cursor-pointer select-none"
            >
              <span>Time</span>
              <SortIcon order={sortOrder} />
            </ColumnHeader>
            <LevelColumnHeader
              selectedLevels={selectedLevels}
              toggleLevel={toggleLevel}
              selectAll={selectAllLevels}
              clearAll={clearAllLevels}
            />
            <CategoryColumnHeader
              allCategories={allCategories}
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
              selectAll={selectAllCategories}
              clearAll={clearAllCategories}
            />
            <ColumnHeader>Message</ColumnHeader>
            <div className="col-span-4 border-b border-stone-700" />
            {filteredAndSortedEntries.map((entry, index) => (
              <LogEntryRow key={index} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnHeader({
  children,
  className,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-1 pb-2 text-xs font-semibold tracking-wide text-stone-400 uppercase",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function SortIcon({ order }: { order: SortOrder }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      strokeWidth="2"
    >
      {order === "desc" ? (
        <path d="M6 15l6 6l6 -6M12 3v18" />
      ) : (
        <path d="M6 9l6 -6l6 6M12 3v18" />
      )}
    </svg>
  );
}

function LevelColumnHeader({
  selectedLevels,
  toggleLevel,
  selectAll,
  clearAll,
}: {
  selectedLevels: Set<LogLevel>;
  toggleLevel: (level: LogLevel) => void;
  selectAll: () => void;
  clearAll: () => void;
}) {
  const allSelected = selectedLevels.size === LOG_LEVELS.length;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={clsx(
          "flex cursor-pointer items-center gap-1 pb-2 text-xs font-semibold tracking-wide uppercase",
          allSelected ? "text-stone-400" : "text-violet-400",
        )}
      >
        <span>Level</span>
        {!allSelected && (
          <span className="text-violet-400">({selectedLevels.size})</span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          strokeWidth="2"
        >
          <path d="M6 9l6 6l6 -6" />
        </svg>
      </MenuButton>
      <MenuItems
        anchor="bottom start"
        className="z-10 mt-1 w-40 rounded-lg bg-stone-800 p-1 shadow-lg ring-1 ring-stone-700 [--anchor-gap:4px]"
      >
        <MenuItem>
          <button
            className="flex w-full items-center rounded px-3 py-1.5 text-left text-sm text-stone-300 data-[focus]:bg-stone-700"
            onClick={allSelected ? clearAll : selectAll}
          >
            {allSelected ? "Clear All" : "Select All"}
          </button>
        </MenuItem>
        <div className="my-1 border-t border-stone-700" />
        {LOG_LEVELS.map((level) => (
          <MenuItem key={level}>
            <button
              className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm data-[focus]:bg-stone-700"
              onClick={() => toggleLevel(level)}
            >
              <span
                className={clsx(
                  "flex size-4 items-center justify-center rounded border",
                  selectedLevels.has(level)
                    ? "border-violet-500 bg-violet-600"
                    : "border-stone-500",
                )}
              >
                {selectedLevels.has(level) && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3"
                    strokeWidth="3"
                  >
                    <path d="M5 12l5 5l10 -10" />
                  </svg>
                )}
              </span>
              <span className={clsx(getLevelColor(level))}>{level}</span>
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

function CategoryColumnHeader({
  allCategories,
  selectedCategories,
  toggleCategory,
  selectAll,
  clearAll,
}: {
  allCategories: string[];
  selectedCategories: Set<string> | "all";
  toggleCategory: (category: string) => void;
  selectAll: () => void;
  clearAll: () => void;
}) {
  const allSelected = selectedCategories === "all";
  const selectedCount = allSelected
    ? allCategories.length
    : selectedCategories.size;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={clsx(
          "flex cursor-pointer items-center gap-1 pb-2 text-xs font-semibold tracking-wide uppercase",
          allSelected ? "text-stone-400" : "text-violet-400",
        )}
      >
        <span>Category</span>
        {!allSelected && (
          <span className="text-violet-400">({selectedCount})</span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          strokeWidth="2"
        >
          <path d="M6 9l6 6l6 -6" />
        </svg>
      </MenuButton>
      <MenuItems
        anchor="bottom start"
        className="z-10 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg bg-stone-800 p-1 shadow-lg ring-1 ring-stone-700 [--anchor-gap:4px]"
      >
        <MenuItem>
          <button
            className="flex w-full items-center rounded px-3 py-1.5 text-left text-sm text-stone-300 data-[focus]:bg-stone-700"
            onClick={allSelected ? clearAll : selectAll}
          >
            {allSelected ? "Clear All" : "Select All"}
          </button>
        </MenuItem>
        <div className="my-1 border-t border-stone-700" />
        {allCategories.map((category) => {
          const isSelected = allSelected || selectedCategories.has(category);
          return (
            <MenuItem key={category}>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm data-[focus]:bg-stone-700"
                onClick={() => toggleCategory(category)}
              >
                <span
                  className={clsx(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    isSelected
                      ? "border-violet-500 bg-violet-600"
                      : "border-stone-500",
                  )}
                >
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3"
                      strokeWidth="3"
                    >
                      <path d="M5 12l5 5l10 -10" />
                    </svg>
                  )}
                </span>
                <span className="truncate text-stone-300">{category}</span>
              </button>
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const levelColor = getLevelColor(entry.level);
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <>
      <span className="text-stone-500">{timestamp}</span>
      <span className={clsx("text-right font-medium", levelColor)}>
        {entry.level}
      </span>
      <span className="text-stone-400">{entry.category}</span>
      <span className="text-stone-200">
        {entry.message}
        {entry.exception && (
          <pre className="mt-1 whitespace-pre-wrap text-red-400">
            {entry.exception}
          </pre>
        )}
      </span>
    </>
  );
}

function getLevelColor(level: LogLevel): string {
  switch (level) {
    case "Trace":
      return "text-stone-500";
    case "Debug":
      return "text-stone-400";
    case "Information":
      return "text-blue-400";
    case "Warning":
      return "text-yellow-400";
    case "Error":
      return "text-red-400";
    case "Critical":
      return "text-red-500";
  }
}
