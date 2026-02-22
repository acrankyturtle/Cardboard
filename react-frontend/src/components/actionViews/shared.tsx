import clsx from "clsx";
import { ReactNode } from "react";
import { ActionEvent } from "../../api/devices.ts";
import { Button } from "../Button.tsx";
import { ActionTypeMenu } from "../ActionTypeMenu.tsx";

export function ActionEventIcon({
  className,
  children,
  setAction,
}: {
  className?: string;
  children?: ReactNode;
  setAction?: (event: ActionEvent) => void;
}) {
  const iconContent = (
    <div
      className={clsx(
        "flex size-8 shrink-0 items-center justify-center",
        className,
      )}
    >
      {children}
    </div>
  );

  if (setAction) {
    return (
      <ActionTypeMenu onSelect={setAction}>
        {({ active }) => (
          <Button
            type="button"
            className="size-8"
            buttonStyle={{
              padding: "none",
              isActive: active,
            }}
          >
            {iconContent}
          </Button>
        )}
      </ActionTypeMenu>
    );
  }

  return iconContent;
}

export function KeyUpDownToggle({
  value,
  onChange,
  keyUp = <KeyUpIcon />,
  keyDown = <KeyDownIcon />,
}: {
  value: "up" | "down";
  onChange?: (value: "up" | "down") => void;
  keyUp?: ReactNode;
  keyDown?: ReactNode;
}) {
  const body = (
    <ActionEventIcon className="">
      {value === "up" ? keyUp : keyDown}
    </ActionEventIcon>
  );
  return onChange ? (
    <Button
      className="w-8"
      buttonStyle={{ padding: "none" }}
      onClick={() => onChange(value === "up" ? "down" : "up")}
    >
      {body}
    </Button>
  ) : (
    body
  );
}

export function KeyDownIcon() {
  return (
    <svg
      className="size-7"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 12h3.586a1 1 0 0 1 .707 1.707l-6.586 6.586a1 1 0 0 1 -1.414 0l-6.586 -6.586a1 1 0 0 1 .707 -1.707h3.586v-3h6v3z" />
      <path d="M15 3h-6" />
      <path d="M15 6h-6" />
    </svg>
  );
}

export function KeyUpIcon() {
  return (
    <svg
      className="size-7"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12h-3.586a1 1 0 0 1 -.707 -1.707l6.586 -6.586a1 1 0 0 1 1.414 0l6.586 6.586a1 1 0 0 1 -.707 1.707h-3.586v3h-6v-3z" />
      <path d="M9 21h6" />
      <path d="M9 18h6" />
    </svg>
  );
}

export function UnknownActionEventView({}: { event: ActionEvent }) {
  return (
    <>
      <ActionEventIcon>
        <svg
          className="-ml-1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4" />
          <path d="M12 19l0 .01" />
        </svg>
      </ActionEventIcon>
    </>
  );
}
