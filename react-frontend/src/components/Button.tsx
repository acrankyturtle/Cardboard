import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import clsx, { ClassValue } from "clsx";

interface ButtonStyleOptions {
  animation?: "normal" | "none";
  focusRing?: "normal" | "dark" | "none";
  variant?:
    | "normal"
    | "submit"
    | "danger"
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
    focusRing === "normal" ? FocusRing : undefined,
    focusRing === "dark" ? DarkFocusRing : undefined,
    rounded === "full" ? "rounded-full" : undefined,
    padding === "normal" ? Padding : undefined,
    variantMap[variant]?.(isActive),
  );
};

const Base: ClassValue =
  "inline-flex items-center text-sm font-medium justify-center select-none not-disabled:cursor-pointer disabled:opacity-30";

const ButtonTextColor = (isActive: boolean): ClassValue =>
  clsx("not-disabled:hover:text-white not-disabled:active:text-white", {
    "text-white": isActive,
    "text-stone-200": !isActive,
  });

const Padding: ClassValue = "p-2";

const DarkFocusRing: ClassValue =
  "focus:ring-1 focus:ring-stone-600/50 focus:ring-offset-1 focus:ring-offset-stone-700/50 focus:outline-none";

const FocusRing: ClassValue =
  "focus:ring-1 focus:ring-stone-500/50 focus:ring-offset-1 focus:ring-offset-stone-400/50 focus:outline-none";

const NormalVariant = (isActive: boolean): ClassValue =>
  clsx(
    "bg-stone-800 not-disabled:hover:bg-stone-700 not-disabled:active:bg-stone-900",
    Base,
    ButtonTextColor(isActive),
  );
const SubmitVariant = (isActive: boolean): ClassValue =>
  clsx(
    "bg-violet-900 not-disabled:hover:bg-violet-800 not-disabled:active:bg-violet-950",
    Base,
    ButtonTextColor(isActive),
  );
const DangerVariant = (isActive: boolean): ClassValue =>
  clsx(
    "bg-red-800 not-disabled:hover:bg-red-700 not-disabled:active:bg-red-950",
    Base,
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
    ButtonTextColor(isActive),
  );
const PanelGhostVariant = (isActive: boolean): ClassValue =>
  clsx(
    "not-disabled:hover:bg-stone-800 not-disabled:active:bg-stone-600",
    Base,
    ButtonTextColor(isActive),
  );
const NavBarVariant = (isActive: boolean): ClassValue =>
  clsx(
    "not-disabled:hover:bg-stone-700 not-disabled:active:bg-stone-600 data-selected:bg-stone-900 data-selected:text-white",
    {
      "bg-stone-900": isActive,
    },
    Base,
    ButtonTextColor(isActive),
  );
const ToolbarVariant = (isActive: boolean): ClassValue =>
  clsx(
    "not-disabled:hover:bg-stone-800 not-disabled:active:bg-stone-600",
    Base,
    ButtonTextColor(isActive),
  );

const NoColorVariant = (isActive: boolean): ClassValue =>
  clsx(Base, ButtonTextColor(isActive));

const variantMap: Record<string, (isActive: boolean) => ClassValue> = {
  normal: NormalVariant,
  submit: SubmitVariant,
  danger: DangerVariant,
  ghost: GhostVariant,
  panelGhost: PanelGhostVariant,
  navbar: NavBarVariant,
  toolbar: ToolbarVariant,
  "no-color": NoColorVariant,
};
