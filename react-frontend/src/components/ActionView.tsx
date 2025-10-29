import {
  Action,
  ActionEvent,
  ConsumerControlEvent,
  DebugActionEvent,
  isConsumerControlActionEvent,
  isDebugActionEvent,
  isKeyboardActionEvent,
  isKeyDownEvent,
  isKeyUpEvent,
  isLayerActionEvent,
  isLayerClearEvent,
  isLayerSetEvent,
  isMouseActionEvent,
  isMouseDownEvent,
  isMouseMoveEvent,
  isMouseScrollEvent,
  isMouseUpEvent,
  KeyboardActionEvent,
  KeyboardKeyDownActionEvent,
  KeyboardKeyUpActionEvent,
  LayerActionEvent,
  MouseActionEvent,
  MouseButtonDownActionEvent,
  MouseButtonUpActionEvent,
} from "../api/devices.ts";
import { ReactNode, useMemo } from "react";
import clsx from "clsx";
import { Button } from "./Button.tsx";
import { Input } from "@headlessui/react";
import { InputClassName } from "./Input.tsx";
import {
  ConsumerControlKeySelector,
  KeyboardKeySelector,
  MouseKeySelector,
} from "./KeySelector.tsx";
import { EditIcon } from "../assets/sharedIcons.tsx";
import { ComboInput } from "./ComboInput.tsx";
import {
  getTagsInProfile,
  useMaybeEditDeviceContext,
} from "../lib/editDeviceContext.tsx";

export function ActionView({
  className,
  action,
  setAction,
  onEdit,
  onDelete,
}: {
  className?: string;
  action: Action;
  setAction?: (a: Action) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={clsx(
        "rounded bg-stone-800 shadow shadow-black/25",
        {
          "outline-3 outline-blue-700": setAction,
        },
        className,
      )}
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
          <ActionEventView
            event={action.actionEvent}
            setEvent={
              setAction
                ? (actionEvent) => {
                    setAction({ ...action, actionEvent });
                  }
                : undefined
            }
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            className={clsx("size-8 shrink-0 justify-self-end", {
              "!text-blue-600 outline-1 outline-blue-700": setAction,
            })}
            onClick={onEdit}
          >
            <EditIcon className="-m-0.5" />
          </Button>
          <Button
            className="size-8 shrink-0 justify-self-end"
            onClick={onDelete}
          >
            <svg
              className="-m-0.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7l16 0" />
              <path d="M10 11l0 6" />
              <path d="M14 11l0 6" />
              <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
              <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ActionEventView({
  event,
  setEvent,
}: {
  event: ActionEvent;
  setEvent?: (event: ActionEvent) => void;
}) {
  return isKeyboardActionEvent(event) ? (
    <KeyboardActionEventView
      event={event.keyboard}
      setEvent={
        setEvent ? (keyboard) => setEvent({ ...event, keyboard }) : undefined
      }
    />
  ) : isMouseActionEvent(event) ? (
    <MouseActionEventView
      event={event.mouse}
      setEvent={setEvent ? (mouse) => setEvent({ ...event, mouse }) : undefined}
    />
  ) : isConsumerControlActionEvent(event) ? (
    <ConsumerControlActionEventView
      event={event.consumerControl}
      setEvent={
        setEvent
          ? (consumerControl) => setEvent({ ...event, consumerControl })
          : undefined
      }
    />
  ) : isLayerActionEvent(event) ? (
    <LayerActionEventView
      event={event.layer}
      setEvent={setEvent ? (layer) => setEvent({ ...event, layer }) : undefined}
    />
  ) : isDebugActionEvent(event) ? (
    <DebugActionEventView
      event={event.debug}
      setEvent={setEvent ? (debug) => setEvent({ ...event, debug }) : undefined}
    />
  ) : (
    <UnknownActionEventView event={event} />
  );
}

function ActionEventIcon({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex size-8 shrink-0 items-center justify-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

function UnknownActionEventView({}: { event: ActionEvent }) {
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

function KeyboardActionEventView({
  event,
  setEvent,
}: {
  event: KeyboardActionEvent;
  setEvent?: (event: KeyboardActionEvent) => void;
}) {
  return (
    <>
      <ActionEventIcon>
        <KeyboardIcon />
      </ActionEventIcon>
      {isKeyDownEvent(event) ? (
        <KeyboardKeyDownActionEventView event={event} setEvent={setEvent} />
      ) : isKeyUpEvent(event) ? (
        <KeyboardKeyUpActionEventView event={event} setEvent={setEvent} />
      ) : (
        <UnknownActionEventView event={event} />
      )}
    </>
  );
}

function KeyUpDownToggle({
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

function KeyboardKeyDownActionEventView({
  event,
  setEvent,
}: {
  event: KeyboardKeyDownActionEvent;
  setEvent?: (event: KeyboardActionEvent) => void;
}) {
  return (
    <>
      <KeyUpDownToggle
        value="down"
        onChange={
          setEvent ? () => setEvent({ keyUp: event.keyDown }) : undefined
        }
      />
      <KeyboardKeySelector
        value={event.keyDown}
        onChange={setEvent ? (keyDown) => setEvent({ keyDown }) : undefined}
      />
    </>
  );
}

function KeyboardKeyUpActionEventView({
  event,
  setEvent,
}: {
  event: KeyboardKeyUpActionEvent;
  setEvent?: (event: KeyboardActionEvent) => void;
}) {
  return (
    <>
      <KeyUpDownToggle
        value="up"
        onChange={
          setEvent ? () => setEvent({ keyDown: event.keyUp }) : undefined
        }
      />
      <KeyboardKeySelector
        value={event.keyUp}
        onChange={setEvent ? (keyUp) => setEvent({ keyUp }) : undefined}
      />
    </>
  );
}

function MouseActionEventView({
  event,
  setEvent,
}: {
  className?: string;
  event: MouseActionEvent;
  setEvent?: (event: MouseActionEvent) => void;
}) {
  return (
    <>
      <ActionEventIcon>
        <MouseIcon />
      </ActionEventIcon>
      {isMouseDownEvent(event) ? (
        <MouseDownActionEventView event={event} setEvent={setEvent} />
      ) : isMouseUpEvent(event) ? (
        <MouseUpActionEventView event={event} setEvent={setEvent} />
      ) : isMouseScrollEvent(event) ? (
        <MouseScrollActionEventView event={event} setEvent={setEvent} />
      ) : isMouseMoveEvent(event) ? (
        <MouseMoveActionEventView event={event} setEvent={setEvent} />
      ) : (
        <UnknownActionEventView event={event} />
      )}
    </>
  );
}

function MouseDownActionEventView({
  event,
  setEvent,
}: {
  event: MouseButtonDownActionEvent;
  setEvent?: (event: MouseActionEvent) => void;
}) {
  return (
    <>
      <KeyUpDownToggle
        value="down"
        onChange={
          setEvent ? () => setEvent({ buttonUp: event.buttonDown }) : undefined
        }
      />
      <MouseKeySelector
        value={event.buttonDown}
        onChange={
          setEvent ? (buttonDown) => setEvent({ buttonDown }) : undefined
        }
      />
    </>
  );
}

function MouseUpActionEventView({
  event,
  setEvent,
}: {
  event: MouseButtonUpActionEvent;
  setEvent?: (event: MouseActionEvent) => void;
}) {
  return (
    <>
      <KeyUpDownToggle
        value="up"
        onChange={
          setEvent ? () => setEvent({ buttonDown: event.buttonUp }) : undefined
        }
      />
      <MouseKeySelector
        value={event.buttonUp}
        onChange={setEvent ? (buttonUp) => setEvent({ buttonUp }) : undefined}
      />
    </>
  );
}

function MouseScrollActionEventView({
  event,
  setEvent,
}: {
  event: MouseActionEvent & { scroll: { x: number; y: number } };
  setEvent?: (event: MouseActionEvent) => void;
}) {
  return (
    <>
      <div>Scroll</div>
      {(event.scroll.x != 0 || setEvent) && (
        <div className="flex items-center gap-1">
          {setEvent ? (
            <Input
              type="number"
              className={clsx("w-16", InputClassName)}
              value={event.scroll.x}
              onChange={(e) =>
                setEvent({
                  ...event,
                  scroll: { ...event.scroll, x: Number(e.target.value) },
                })
              }
              aria-label="Scroll X"
            />
          ) : (
            <>
              <div>X:</div>
              <div>{event.scroll.x}</div>
            </>
          )}
        </div>
      )}
      {(event.scroll.y != 0 || setEvent) && (
        <div className="flex items-center gap-1">
          {setEvent ? (
            <Input
              type="number"
              className={clsx("w-16", InputClassName)}
              value={event.scroll.y}
              onChange={(e) =>
                setEvent({
                  ...event,
                  scroll: { ...event.scroll, y: Number(e.target.value) },
                })
              }
              aria-label="Scroll Y"
            />
          ) : (
            <>
              <div>Y:</div>
              <div>{event.scroll.y}</div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MouseMoveActionEventView({
  event,
  setEvent,
}: {
  event: MouseActionEvent & { move: { x: number; y: number } };
  setEvent?: (event: MouseActionEvent) => void;
}) {
  return (
    <>
      <div>Move</div>
      {(event.move.x != 0 || setEvent) && (
        <div className="flex items-center gap-1">
          {setEvent ? (
            <Input
              type="number"
              className={clsx("w-16", InputClassName)}
              value={event.move.x}
              onChange={(e) =>
                setEvent({
                  ...event,
                  move: { ...event.move, x: Number(e.target.value) },
                })
              }
              aria-label="Move X"
            />
          ) : (
            <>
              <div>X:</div>
              <div>{event.move.x}</div>
            </>
          )}
        </div>
      )}
      {(event.move.y != 0 || setEvent) && (
        <div className="flex items-center gap-1">
          {setEvent ? (
            <Input
              type="number"
              className={clsx("w-16", InputClassName)}
              value={event.move.y}
              onChange={(e) =>
                setEvent({
                  ...event,
                  move: { ...event.move, y: Number(e.target.value) },
                })
              }
              aria-label="Move Y"
            />
          ) : (
            <>
              <div>Y:</div>
              <div>{event.move.y}</div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function ConsumerControlActionEventView({
  event,
  setEvent,
}: {
  event: ConsumerControlEvent;
  setEvent?: (event: ConsumerControlEvent) => void;
}) {
  return (
    <>
      <ActionEventIcon>
        <ConsumerControlIcon />
      </ActionEventIcon>
      <ConsumerControlKeySelector
        value={event}
        onChange={setEvent ? (e) => setEvent(e) : undefined}
      />
    </>
  );
}

function LayerActionEventView({
  event,
  setEvent,
}: {
  event: LayerActionEvent;
  setEvent?: (event: LayerActionEvent) => void;
}) {
  const context = useMaybeEditDeviceContext();
  const items = useMemo(
    () =>
      context
        ? getTagsInProfile(context.state.profile).map((t) => ({
            id: t,
            name: t,
          }))
        : [],
    [context],
  );

  return (
    <>
      <div>Layer</div>
      {isLayerClearEvent(event) ? (
        <>
          <KeyUpDownToggle
            value="up"
            onChange={
              setEvent ? () => setEvent({ set: event.clear }) : undefined
            }
            keyUp={<ClearLayerIcon />}
            keyDown={<SetLayerIcon />}
          />
          {setEvent ? (
            <ComboInput
              className="w-16 min-w-0"
              value={{ id: event.clear, name: event.clear }}
              onChange={(e) => setEvent({ clear: e.id })}
              items={items}
              itemFromQuery={(query) => {
                query = query.trim().toLowerCase();
                if (query.length < 1 || query.length > 255) return undefined;
                return { id: query, name: query };
              }}
            />
          ) : (
            <div>{event.clear}</div>
          )}
        </>
      ) : isLayerSetEvent(event) ? (
        <>
          <KeyUpDownToggle
            value="down"
            onChange={
              setEvent ? () => setEvent({ clear: event.set }) : undefined
            }
            keyUp={<ClearLayerIcon />}
            keyDown={<SetLayerIcon />}
          />
          {setEvent ? (
            <Input
              type="text"
              className={clsx("min-w-0", InputClassName)}
              maxLength={255}
              value={event.set}
              onChange={(e) => setEvent({ set: e.target.value })}
            />
          ) : (
            <div>{event.set}</div>
          )}
        </>
      ) : (
        <UnknownActionEventView event={event} />
      )}
    </>
  );
}

function DebugActionEventView({
  event,
}: {
  event: DebugActionEvent;
  setEvent?: (event: DebugActionEvent) => void;
}) {
  return (
    <>
      <ActionEventIcon>
        <DebugIcon />
      </ActionEventIcon>
      <div className="line-clamp-1 text-xs">{event.log}</div>
    </>
  );
}

export function KeyboardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z" />
      <path d="M6 10l0 .01" />
      <path d="M10 10l0 .01" />
      <path d="M14 10l0 .01" />
      <path d="M18 10l0 .01" />
      <path d="M6 14l0 .01" />
      <path d="M18 14l0 .01" />
      <path d="M10 14l4 .01" />
    </svg>
  );
}

export function MouseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3m0 4a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4z" />
      <path d="M12 7l0 4" />
    </svg>
  );
}

export function ConsumerControlIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M7 3m0 2a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2z" />
      <path d="M12 3v2" />
      <path d="M10 15v.01" />
      <path d="M10 18v.01" />
      <path d="M14 18v.01" />
      <path d="M14 15v.01" />
    </svg>
  );
}

export function LayerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" />
      <path d="M17 17v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2" />
    </svg>
  );
}

export function DebugIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 9l3 3l-3 3" />
      <path d="M13 15l3 0" />
      <path d="M4 4m0 4a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z" />
    </svg>
  );
}

function KeyDownIcon() {
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

function KeyUpIcon() {
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

function SetLayerIcon() {
  return (
    <svg
      className="p-1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
      <path d="M9 12l2 2l4 -4" />
    </svg>
  );
}

function ClearLayerIcon() {
  return (
    <svg
      className="p-1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 4h10a2 2 0 0 1 2 2v10m-.584 3.412a2 2 0 0 1 -1.416 .588h-12a2 2 0 0 1 -2 -2v-12c0 -.552 .224 -1.052 .586 -1.414" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
