import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx, { ClassValue } from "clsx";

interface ButtonStyleOptions {
  animation?: "normal" | "none";
  focusRing?: "normal" | "dark";
  variant?: "normal" | "submit" | "panelGhost" | "navbar";
}

export function Button({
  className,
  children,
  buttonStyle,
  ...props
}: {
  className?: string;
  children?: ReactNode;
  buttonStyle?: ButtonStyleOptions;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(getButtonClassName(buttonStyle ?? {}), className)}
      {...props}
    >
      {children}
    </button>
  );
}

export const getButtonClassName = ({
  animation = "normal",
  focusRing = "normal",
  variant = "normal",
}: ButtonStyleOptions) => {
  return clsx(
    animation === "normal" ? "transition-all duration-150" : undefined,
    focusRing === "normal" ? FocusRing : undefined,
    focusRing === "dark" ? DarkFocusRing : undefined,
    variant === "normal"
      ? NormalVariant
      : variant === "submit"
        ? SubmitVariant
        : variant === "panelGhost"
          ? PanelGhostVariant
          : variant === "navbar"
            ? NavBarVariant
            : undefined,
  );
};

const Base: ClassValue =
  "inline-flex items-center rounded-full p-2 text-sm font-medium justify-center";

const DarkFocusRing: ClassValue =
  "focus:ring-1 focus:ring-stone-600/50 focus:ring-offset-1 focus:ring-offset-stone-700/50 focus:outline-none";

const FocusRing: ClassValue =
  "focus:ring-1 focus:ring-stone-500/50 focus:ring-offset-1 focus:ring-offset-stone-400/50 focus:outline-none";

const NormalVariant: ClassValue = clsx(
  "bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white active:text-white active:bg-stone-900",
  Base,
);
const SubmitVariant: ClassValue = clsx(
  "bg-violet-950 text-stone-200 hover:bg-violet-900 hover:text-white active:text-white active:bg-violet-800",
  Base,
);
const PanelGhostVariant: ClassValue = clsx(
  "text-stone-300 hover:bg-stone-800 hover:text-white active:text-white active:bg-stone-600",
  Base,
);
const NavBarVariant: ClassValue = clsx(
  "text-stone-300 hover:bg-stone-700 hover:text-white active:text-white active:bg-stone-600 data-selected:bg-stone-900 data-selected:text-white",
  Base,
);
