import { Input as HeadlessInput } from "@headlessui/react";
import clsx from "clsx";
import { ComponentPropsWithRef } from "react";

export function Input({
  className,
}: ComponentPropsWithRef<typeof HeadlessInput>) {
  return <HeadlessInput className={clsx(InputClassName, className)} />;
}

export const InputClassName =
  "rounded-md border-1 border-stone-900 bg-stone-800 shadow-sm outline-0 focus:ring-1 focus:ring-stone-500 px-2 py-1 data-disabled:opacity-50";
