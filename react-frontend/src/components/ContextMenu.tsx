import { ContextMenu as BaseContextMenu } from "@base-ui-components/react/context-menu";
import clsx from "clsx";
import { ReactNode } from "react";

export function ContextMenu({ children }: { children: ReactNode }) {
  return <BaseContextMenu.Root>{children}</BaseContextMenu.Root>;
}

export function ContextMenuTrigger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <BaseContextMenu.Trigger className={clsx("contents", className)}>
      {children}
    </BaseContextMenu.Trigger>
  );
}

export function ContextMenuPopup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner>
        <BaseContextMenu.Popup
          className={clsx(
            "z-50 min-w-40 rounded border border-stone-950 bg-stone-800 py-1 shadow-lg shadow-black/50 outline-none",
            className,
          )}
        >
          {children}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
}

export function ContextMenuIcon({ children }: { children: ReactNode }) {
  return <div className="size-5 shrink-0">{children}</div>;
}

export function ContextMenuItem({
  className,
  children,
  onClick,
  disabled,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <BaseContextMenu.Item
      className={clsx(
        "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-stone-50 outline-offset-1 outline-stone-400 select-none active:outline-stone-50",
        {
          "cursor-pointer active:bg-stone-700 data-[highlighted]:bg-stone-700 data-[highlighted]:outline-1 data-[highlighted]:active:bg-stone-600":
            !disabled,
          "opacity-40 outline-none": disabled,
        },
        className,
      )}
      disabled={disabled}
      onClick={(e) => {
        if (!e.isTrusted) return;
        onClick?.();
      }}
    >
      {children}
    </BaseContextMenu.Item>
  );
}

export function ContextMenuSeparator() {
  return <BaseContextMenu.Separator className="mx-3 my-1 h-px bg-stone-700" />;
}
