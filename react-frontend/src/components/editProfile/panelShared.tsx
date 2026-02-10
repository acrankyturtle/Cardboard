import clsx from "clsx";
import { ReactNode } from "react";
import { getButtonClassName } from "../Button.tsx";

export function PanelContainer({
  className,
  children,
  ref,
}: {
  className?: string;
  children?: ReactNode;
  ref?: (element: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={ref}
      className={clsx("flex flex-col overflow-y-auto bg-stone-800", className)}
    >
      {children}
    </div>
  );
}

export function HeaderBar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "sticky top-0 flex h-9 shrink-0 items-center gap-1 border-b border-stone-950 bg-stone-700 p-1 text-lg tracking-widest",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const headerBarIconClass = "size-6 text-stone-100";

export const headerBarButtonClass = clsx(
  headerBarIconClass,
  getButtonClassName({
    variant: "toolbar",
    padding: "none",
  }),
);
