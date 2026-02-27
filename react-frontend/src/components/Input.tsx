import clsx, { ClassValue } from "clsx";

const BaseClassName: ClassValue =
  "rounded-md border-1 shadow-sm outline-0 focus-within:ring-1 focus-within:ring-violet-500 px-2 py-1 data-disabled:opacity-50";

export const InputClassName: ClassValue = clsx(
  "border-stone-900 bg-stone-800",
  BaseClassName,
);

export const DarkInputClassName: ClassValue = clsx(
  "border-stone-700 bg-stone-900",
  BaseClassName,
);
