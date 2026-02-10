import {
  Action,
  ActionEvent,
  isConsumerControlActionEvent,
  isDebugActionEvent,
  isKeyboardActionEvent,
  isLayerActionEvent,
  isMouseActionEvent,
} from "../api/devices.ts";
import { forwardRef } from "react";
import clsx from "clsx";
import { Button } from "./Button.tsx";
import { Input } from "@headlessui/react";
import { InputClassName } from "./Input.tsx";
import { DeleteIcon, EditIcon, WarningIcon } from "../assets/sharedIcons.tsx";
import { Tooltip } from "./Tooltip.tsx";
import { useMaybeEditDeviceContext } from "../lib/editDeviceContext.tsx";
import { UnknownActionEventView } from "./actionViews/shared.tsx";
import { KeyboardActionEventView } from "./actionViews/KeyboardActionEventView.tsx";
import { MouseActionEventView } from "./actionViews/MouseActionEventView.tsx";
import { LayerActionEventView } from "./actionViews/LayerActionEventView.tsx";
import {
  ConsumerControlActionEventView,
  DebugActionEventView,
} from "./actionViews/OtherActionEventViews.tsx";

export const ActionView = forwardRef<
  HTMLDivElement,
  {
    className?: string;
    action: Action;
    setAction?: (a: Action) => void;
    onEdit?: () => void;
    onDelete?: () => void;
    compact?: boolean;
  }
>(function ActionView(
  { className, action, setAction, onEdit, onDelete, compact },
  ref,
) {
  const editDevice = useMaybeEditDeviceContext();
  const isMouseDisabledWarning =
    editDevice &&
    !editDevice.state.device.settings.isMouseEnabled &&
    isMouseActionEvent(action.actionEvent);

  if (compact) {
    return (
      <div
        ref={ref}
        className={clsx(
          "flex items-center gap-1 rounded bg-stone-800 px-2 py-1 text-xs shadow shadow-black/25",
          isMouseDisabledWarning && "outline-2 outline-orange-600",
          className,
        )}
      >
        {isMouseDisabledWarning && <MouseDisabledWarning compact />}
        <ActionEventView event={action.actionEvent} />
        {onDelete && (
          <Tooltip content="Delete action">
            <button
              className="ml-1 text-stone-400 hover:text-stone-200"
              onClick={onDelete}
            >
              ×
            </button>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={clsx(
        "rounded bg-stone-800 shadow shadow-black/25",
        {
          "outline-3 outline-blue-700": setAction,
          "outline-2 outline-orange-600": isMouseDisabledWarning && !setAction,
        },
        className,
      )}
      data-editing={setAction ? "true" : undefined}
      tabIndex={setAction ? 0 : undefined}
      onMouseDown={(e) => {
        // focus the container when clicking non-interactive areas to prevent blur from exiting edit mode
        if (setAction) {
          const target = e.target as HTMLElement;
          const isInteractive = target.closest(
            "button, input, [role='button']",
          );
          if (!isInteractive) {
            e.currentTarget.focus();
          }
        }
      }}
    >
      {(action.predelayMs > 0 || setAction) && (
        <>
          <div className="flex min-h-9 items-center gap-0.5 p-2 text-xs text-stone-300">
            <div className="size-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13a7 7 0 1 0 14 0a7 7 0 0 0 -14 0z" />
                <path d="M14.5 10.5l-2.5 2.5" />
                <path d="M17 8l1 -1" />
                <path d="M14 3h-4" />
              </svg>
            </div>
            <div>
              <span>Wait&nbsp;</span>
              {setAction ? (
                <Input
                  type="number"
                  className={clsx("mx-1 h-8 w-20", InputClassName)}
                  value={action.predelayMs}
                  onChange={(e) =>
                    setAction({
                      ...action,
                      predelayMs: Math.max(0, Number(e.target.value)),
                    })
                  }
                  min={0}
                  aria-label="Predelay in milliseconds"
                />
              ) : (
                <span>{action.predelayMs}</span>
              )}
              <span>ms</span>
            </div>
          </div>
          <div className="mx-2 border-b border-stone-700" />
        </>
      )}
      <div className="flex w-full items-center justify-between gap-2 px-2 py-1">
        <div className="flex grow items-center gap-1 overflow-hidden p-[1px]">
          {isMouseDisabledWarning && <MouseDisabledWarning />}
          <ActionEventView
            event={action.actionEvent}
            setAction={
              setAction
                ? (actionEvent) => {
                    setAction({ ...action, actionEvent });
                  }
                : undefined
            }
          />
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content="Edit action">
            <Button
              className={clsx("size-8 shrink-0 justify-self-end", {
                "!text-blue-600 outline-1 outline-blue-700": setAction,
              })}
              onClick={onEdit}
            >
              <EditIcon className="-m-0.5" />
            </Button>
          </Tooltip>
          <Tooltip content="Delete action">
            <Button
              className="size-8 shrink-0 justify-self-end"
              onClick={onDelete}
            >
              <DeleteIcon className="-m-0.5" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});

function MouseDisabledWarning({ compact }: { compact?: boolean }) {
  return (
    <Tooltip content="Mouse input is disabled for this device. This action will not work until mouse input is enabled.">
      <span className="flex shrink-0">
        <WarningIcon
          className={clsx("text-orange-500", compact ? "size-4" : "size-5")}
        />
      </span>
    </Tooltip>
  );
}

function ActionEventView({
  event,
  setAction,
}: {
  event: ActionEvent;
  setAction?: (event: ActionEvent) => void;
}) {
  return isKeyboardActionEvent(event) ? (
    <KeyboardActionEventView event={event.keyboard} setAction={setAction} />
  ) : isMouseActionEvent(event) ? (
    <MouseActionEventView event={event.mouse} setAction={setAction} />
  ) : isConsumerControlActionEvent(event) ? (
    <ConsumerControlActionEventView
      event={event.consumerControl}
      setAction={setAction}
    />
  ) : isLayerActionEvent(event) ? (
    <LayerActionEventView event={event.layer} setAction={setAction} />
  ) : isDebugActionEvent(event) ? (
    <DebugActionEventView event={event.debug} setAction={setAction} />
  ) : (
    <UnknownActionEventView event={event} />
  );
}
