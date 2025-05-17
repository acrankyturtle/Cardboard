import clsx from "clsx";
import { ReactNode } from "react";

function Page({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex w-5xl shrink-1 flex-col gap-10 px-4 py-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Title({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <h2
      className={clsx(
        "sticky text-2xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Body({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

Page.Title = Title;
Page.Body = Body;

export default Page;
