import { forwardRef, ReactNode, Ref } from "react";
import clsx, { ClassValue } from "clsx";

export interface ListItemProps {
  children?: ReactNode;
  className?: string;
  selected?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export const ListItem = forwardRef<HTMLDivElement, ListItemProps>(
  function ListItem({ children, className, selected: _ }, ref) {
    return (
      <div
        ref={ref}
        className={clsx(
          "px-4 py-2 transition-colors duration-150 select-none",
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

type ItemVariant = "violet" | "yellow" | "red" | "green" | "blue";

const getVariantStyle = (
  variant: ItemVariant,
  selected: boolean,
): ClassValue => {
  switch (variant) {
    case "violet":
      return VioletListItemClass(selected);
    case "yellow":
      return YellowListItemClass(selected);
    case "red":
      return RedListItemClass(selected);
    case "green":
      return GreenListItemClass(selected);
    case "blue":
      return BlueListItemClass(selected);
  }
};

const VioletListItemClass = (selected: boolean): ClassValue => ({
  "bg-violet-900 hover:bg-violet-800": selected,
  "hover:bg-stone-700 active:bg-violet-900/50 active:not-hover:bg-stone-900":
    !selected,
});

const YellowListItemClass = (selected: boolean): ClassValue => ({
  "bg-yellow-900 hover:bg-yellow-800": selected,
  "hover:bg-stone-700 active:bg-yellow-900/50 active:not-hover:bg-stone-900":
    !selected,
});
const RedListItemClass = (selected: boolean): ClassValue => ({
  "bg-red-900 hover:bg-red-800": selected,
  "hover:bg-stone-700 active:bg-red-900/50 active:not-hover:bg-stone-900":
    !selected,
});
const GreenListItemClass = (selected: boolean): ClassValue => ({
  "bg-lime-900 hover:bg-lime-800": selected,
  "hover:bg-stone-700 active:bg-lime-900/50 active:not-hover:bg-stone-900":
    !selected,
});
const BlueListItemClass = (selected: boolean): ClassValue => ({
  "bg-blue-900 hover:bg-blue-800": selected,
  "hover:bg-stone-700 active:bg-blue-900/50 active:not-hover:bg-stone-900":
    !selected,
});

function makeVariantListItem(variant: ItemVariant) {
  return forwardRef<HTMLDivElement, ListItemProps>(function VariantListItem(
    { children, className, selected, ...props },
    ref,
  ) {
    return (
      <ListItem
        ref={ref}
        className={clsx(getVariantStyle(variant, selected ?? false), className)}
        selected={selected}
        {...props}
      >
        {children}
      </ListItem>
    );
  });
}

export const VioletListItem = makeVariantListItem("violet");
export const BlueListItem = makeVariantListItem("blue");
export const RedListItem = makeVariantListItem("red");
export const GreenListItem = makeVariantListItem("green");
export const YellowListItem = makeVariantListItem("yellow");
