import clsx from "clsx";
import { useMemo } from "react";
import { ComboInput } from "../ComboInput.tsx";

export function LayerTagSelector({
  className,
  value,
  items,
  onChange,
}: {
  className?: string;
  value: string;
  items: readonly string[];
  onChange?: (value: string) => void;
}) {
  const comboItems = useMemo(
    () => items.map((t) => ({ id: t, name: t })),
    [items],
  );

  const itemFromQuery = (query: string) => {
    const q = query.trim().toLowerCase();
    if (q.length < 1 || q.length > 255) return undefined;
    if (comboItems.some((i) => i.id === q)) return undefined;
    return { id: q, name: q };
  };

  return onChange ? (
    <div
      className={clsx(
        "flex grow items-center gap-1 overflow-hidden p-[1px] select-none",
        className,
      )}
    >
      <ComboInput
        variant="compact"
        value={{ id: value, name: value }}
        onChange={(v) => onChange(v.id)}
        items={comboItems}
        itemFromQuery={itemFromQuery}
      />
    </div>
  ) : (
    <div className="truncate">{value}</div>
  );
}
