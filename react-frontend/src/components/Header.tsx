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
        "w-full items-center bg-stone-900 px-10 py-5 text-2xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Header;
