import clsx from "clsx";
import { ComponentProps, ReactNode } from "react";
import { Button } from "../Button.tsx";

export function PanelContainer({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={clsx("flex flex-col overflow-y-auto bg-stone-800", className)}
      {...props}
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

export function HeaderBarButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <Button
      className={clsx(headerBarIconClass, className)}
      buttonStyle={{
        variant: "toolbar",
        padding: "none",
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export const headerBarIconClass = "size-6 text-stone-100 shrink-0";
