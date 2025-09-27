import { Select as HeadlessSelect } from "@headlessui/react";
import clsx from "clsx";
import { OptionHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <HeadlessSelect
      className={clsx(
        "rounded-xl bg-stone-800 px-2 py-1 text-sm text-stone-100 shadow-sm outline-0 focus:border-stone-600 focus:ring-1 focus:ring-stone-500 data-hover:bg-stone-900",
        className,
      )}
      {...props}
    >
      {children}
    </HeadlessSelect>
  );
}

export function SelectOption({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
} & OptionHTMLAttributes<HTMLOptionElement>) {
  return (
    <option className={clsx("bg-stone-800", className)} {...props}>
      {children}
    </option>
  );
}
