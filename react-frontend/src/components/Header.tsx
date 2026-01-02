import { ReactNode } from "react";
import clsx from "clsx";

export function Header({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "h-18 w-full shrink-0 items-center bg-stone-900 px-10 text-2xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Header;
