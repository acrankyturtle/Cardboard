import {
  Description,
  Dialog as HeadlessDialog,
  DialogBackdrop as HeadlessDialogBackdrop,
  DialogPanel as HeadlessDialogPanel,
  DialogTitle as HeadlessDialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { ReactNode } from "react";
import { Button } from "./Button";

export function Dialog({
  className,
  children,
  closeOnBackdropClick = true,
  onClose = () => {},
  ...props
}: {
  className?: string;
  children?: ReactNode;
  open?: boolean;
  onClose?: (value: boolean) => void;
  closeOnBackdropClick?: boolean;
}) {
  const panelClassName = clsx(
    "flex flex-col gap-y-4 rounded-2xl border-2 border-stone-950 bg-stone-700 p-4 text-stone-100 shadow-lg shadow-black/50",
    className,
  );
  return (
    <HeadlessDialog {...props} onClose={onClose}>
      <HeadlessDialogBackdrop
        className={clsx("fixed inset-0 bg-black/30 backdrop-blur-sm", {
          "pointer-events-none": !closeOnBackdropClick,
        })}
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center">
        {closeOnBackdropClick ? ( // todo: do we need this???
          <HeadlessDialogPanel className={panelClassName}>
            {children}
          </HeadlessDialogPanel>
        ) : (
          <div className={panelClassName}>{children}</div>
        )}
      </div>
    </HeadlessDialog>
  );
}

export function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>{children}</div>
  );
}

export function DialogHeaderTitle({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <HeadlessDialogTitle
      className={clsx(
        "text-lg font-bold drop-shadow-md drop-shadow-black/25",
        className,
      )}
    >
      {children}
    </HeadlessDialogTitle>
  );
}

export function DialogHeaderDescription({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Description className={clsx("text-stone-400 italic", className)}>
      {children}
    </Description>
  );
}

export function DialogDivider({ className }: { className?: string }) {
  return (
    <div className={clsx("w-full border-b border-stone-800", className)} />
  );
}

export function DialogBody({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>{children}</div>
  );
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <div className={clsx("flex gap-4 pt-6", className)}>{children}</div>;
}

export function DialogConfirmButton({
  className,
  children,
  onClick,
}: {
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      className={clsx("min-w-24", className)}
      buttonStyle={{ variant: "submit" }}
      onClick={onClick}
      type="submit"
    >
      {children}
    </Button>
  );
}

export function DialogCancelButton({
  className,
  children,
  onClick,
}: {
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      className={clsx("px-3", className)}
      buttonStyle={{ variant: "panelGhost" }}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
