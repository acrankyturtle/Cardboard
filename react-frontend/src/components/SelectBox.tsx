import { Select as HeadlessSelect } from "@headlessui/react";
import clsx from "clsx";
import { OptionHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import {
  DarkInputClassName,
  InputClassName,
} from "@root/react-frontend/src/components/Input.tsx";

export function Select({
  className,
  children,
  dark,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  dark?: boolean;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <HeadlessSelect
      className={clsx(dark ? DarkInputClassName : InputClassName, className)}
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
