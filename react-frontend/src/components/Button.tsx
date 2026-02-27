import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import clsx, { ClassValue } from "clsx";

interface ButtonStyleOptions {
  animation?: "normal" | "none";
  focusRing?: "normal" | "dark" | "none";
  variant?: ButtonVariant;
  rounded?: "full" | "none";
  padding?: "normal" | "none";
  disabled?: "half-opacity" | "none";
  isActive?: boolean;
}

type ButtonVariant =
  | "normal"
  | "submit"
  | "danger"
  | "ghost"
  | "panelGhost"
  | "navbar"
  | "toolbar"
  | "no-color"
  | "link"
  | "dim-ghost";

export const Button = forwardRef<
  HTMLButtonElement,
  {
    className?: string;
    children?: ReactNode;
    buttonStyle?: ButtonStyleOptions;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ className, children, buttonStyle, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(getButtonClassName(buttonStyle ?? {}), className)}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
});

export const getButtonClassName = ({
  animation = "normal",
  focusRing = "normal",
  variant = "normal",
  rounded = "full",
  padding = "normal",
  isActive = false,
}: ButtonStyleOptions): string => {
  return clsx(
    animation === "normal" ? "transition-all duration-150" : undefined,
    focusRing === "normal" && variant !== "link" ? FocusRing : undefined,
    focusRing === "dark" ? DarkFocusRing : undefined,
    rounded === "full" ? "rounded-full" : undefined,
    padding === "normal" && variant !== "link" ? Padding : undefined,
    variantMap(variant)?.(isActive),
  );
};

const Base: ClassValue =
  "inline-flex items-center justify-center select-none not-disabled:cursor-pointer disabled:opacity-30";

const BaseText: ClassValue = "text-sm font-medium";

const ButtonTextColor = (isActive: boolean): ClassValue =>
  clsx("not-disabled:hover:text-white not-disabled:active:text-white", {
    "text-white": isActive,
    "text-stone-200": !isActive,
  });

const Padding: ClassValue = "p-2";

const DarkFocusRing: ClassValue =
  "focus:ring-1 focus:ring-stone-600/50 focus:ring-offset-1 focus:ring-offset-stone-700/50 focus:outline-none data-focus:ring-1 data-focus:ring-stone-600/50 data-focus:ring-offset-1 data-focus:ring-offset-stone-700/50 data-focus:outline-none";

const FocusRing: ClassValue =
  "focus:ring-1 focus:ring-stone-500/50 focus:ring-offset-1 focus:ring-offset-stone-400/50 focus:outline-none data-focus:ring-1 data-focus:ring-stone-500/50 data-focus:ring-offset-1 data-focus:ring-offset-stone-400/50 data-focus:outline-none";

const LinkBase = (isActive: boolean): ClassValue =>
  clsx(
    "not-disabled:hover:underline not-disabled:active:underline focus:underline outline-none",
    {
      underline: isActive,
    },
  );

const NormalVariant = (isActive: boolean): ClassValue =>
  clsx(
    "bg-stone-800 not-disabled:hover:bg-stone-700 not-disabled:active:bg-stone-900",
    Base,
    BaseText,
    ButtonTextColor(isActive),
  );
const SubmitVariant = (isActive: boolean): ClassValue =>
  clsx(
    "bg-violet-900 not-disabled:hover:bg-violet-800 not-disabled:active:bg-violet-950",
    Base,
    BaseText,
    ButtonTextColor(isActive),
  );
const DangerVariant = (isActive: boolean): ClassValue =>
  clsx(
    "bg-red-800 not-disabled:hover:bg-red-700 not-disabled:active:bg-red-950",
    Base,
    BaseText,
    ButtonTextColor(isActive),
  );
const GhostVariant = (isActive: boolean): ClassValue =>
  clsx(
    "not-disabled:active:bg-stone-600",
    {
      "bg-stone-900": isActive,
      "not-disabled:hover:bg-stone-800": !isActive,
    },
    Base,
    BaseText,
    ButtonTextColor(isActive),
  );
const PanelGhostVariant = (isActive: boolean): ClassValue =>
  clsx(
    "not-disabled:hover:bg-stone-800 not-disabled:active:bg-stone-600",
    Base,
    BaseText,
    ButtonTextColor(isActive),
  );
const NavBarVariant = (isActive: boolean): ClassValue =>
  clsx(
    "not-disabled:hover:bg-stone-700 not-disabled:active:bg-stone-600 data-selected:bg-stone-900 data-selected:text-white",
    {
      "bg-stone-900": isActive,
    },
    Base,
    BaseText,
    ButtonTextColor(isActive),
  );
const ToolbarVariant = (isActive: boolean): ClassValue =>
  clsx(
    "not-disabled:hover:bg-stone-800 not-disabled:active:bg-stone-600",
    Base,
    ButtonTextColor(isActive),
  );
const VioletLinkVariant = (isActive: boolean): ClassValue =>
  clsx(
    "text-violet-400 not-disabled:hover:text-violet-300 not-disabled:active:text-violet-200",
    {
      "text-violet-300": isActive,
    },
    Base,
    LinkBase(isActive),
  );

const DimGhostVariant = (isActive: boolean): ClassValue =>
  clsx(
    "text-stone-400 not-disabled:hover:text-stone-100",
    {
      "text-stone-100": isActive,
    },
    Base,
  );

const NoColorVariant = (isActive: boolean): ClassValue =>
  clsx(Base, ButtonTextColor(isActive));

const variantMap = (
  variant: ButtonVariant,
): ((isActive: boolean) => ClassValue) => {
  switch (variant) {
    case "normal":
      return NormalVariant;
    case "submit":
      return SubmitVariant;
    case "danger":
      return DangerVariant;
    case "ghost":
      return GhostVariant;
    case "panelGhost":
      return PanelGhostVariant;
    case "navbar":
      return NavBarVariant;
    case "toolbar":
      return ToolbarVariant;
    case "no-color":
      return NoColorVariant;
    case "link":
      return VioletLinkVariant;
    case "dim-ghost":
      return DimGhostVariant;
  }
};
