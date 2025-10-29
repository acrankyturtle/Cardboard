import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx, { ClassValue } from "clsx";

interface ButtonStyleOptions {
  animation?: "normal" | "none";
  focusRing?: "normal" | "dark" | "none";
  variant?:
    | "normal"
    | "submit"
    | "ghost"
    | "panelGhost"
    | "navbar"
    | "toolbar"
    | "no-color";
  rounded?: "full" | "none";
  padding?: "normal" | "none";
  disabled?: "half-opacity" | "none";
  isActive?: boolean;
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
  rounded = "full",
  padding = "normal",
  isActive = false,
  disabled = "half-opacity",
}: ButtonStyleOptions): string => {
  return clsx(
    animation === "normal" ? "transition-all duration-150" : undefined,
    focusRing === "normal" ? FocusRing : undefined,
    focusRing === "dark" ? DarkFocusRing : undefined,
    rounded === "full" ? "rounded-full" : undefined,
    padding === "normal" ? Padding : undefined,
    disabled === "half-opacity" ? "data-disabled:opacity-50" : undefined,
    variant === "normal"
      ? NormalVariant(isActive)
      : variant === "submit"
        ? SubmitVariant(isActive)
        : variant === "ghost"
          ? GhostVariant(isActive)
          : variant === "panelGhost"
            ? PanelGhostVariant(isActive)
            : variant === "navbar"
              ? NavBarVariant(isActive)
              : variant === "toolbar"
                ? ToolbarVariant(isActive)
                : variant === "no-color"
                  ? NoColorVariant
                  : undefined,
  );
};

const Base: ClassValue =
  "inline-flex items-center text-sm font-medium justify-center select-none cursor-pointer";

const Padding: ClassValue = "p-2";

const DarkFocusRing: ClassValue =
  "focus:ring-1 focus:ring-stone-600/50 focus:ring-offset-1 focus:ring-offset-stone-700/50 focus:outline-none";

const FocusRing: ClassValue =
  "focus:ring-1 focus:ring-stone-500/50 focus:ring-offset-1 focus:ring-offset-stone-400/50 focus:outline-none";

const NormalVariant = (isActive: boolean): ClassValue =>
  clsx(
    "bg-stone-800 hover:bg-stone-700 hover:text-white active:text-white active:bg-stone-900",
    {
      "text-stone-100": isActive,
      "text-stone-300": !isActive,
    },
    Base,
  );
const SubmitVariant = (isActive: boolean): ClassValue =>
  clsx(
    "bg-violet-900 hover:bg-violet-800 hover:text-white active:text-white active:bg-violet-950",
    {
      "test-stone-50": isActive,
      "text-stone-200": !isActive,
    },
    Base,
  );
const GhostVariant = (isActive: boolean): ClassValue =>
  clsx(
    "hover:text-white active:text-white active:bg-stone-600",
    {
      "text-stone-100 bg-stone-900": isActive,
      "text-stone-300 hover:bg-stone-800": !isActive,
    },
    Base,
  );
const PanelGhostVariant = (isActive: boolean): ClassValue =>
  clsx(
    "hover:bg-stone-800 hover:text-white active:text-white active:bg-stone-600",
    {
      "text-stone-100": isActive,
      "text-stone-300": !isActive,
    },
    Base,
  );
const NavBarVariant = (isActive: boolean): ClassValue =>
  clsx(
    "hover:bg-stone-700 hover:text-white active:text-white active:bg-stone-600 data-selected:bg-stone-900 data-selected:text-white",
    {
      "text-stone-50 bg-stone-900": isActive,
      "text-stone-300": !isActive,
    },
    Base,
  );
const ToolbarVariant = (isActive: boolean): ClassValue =>
  clsx(
    "hover:bg-stone-800 hover:text-white active:text-white active:bg-stone-600",
    {
      "text-stone-100": isActive,
      "text-stone-300": !isActive,
    },
    Base,
  );

const NoColorVariant: ClassValue = Base;
