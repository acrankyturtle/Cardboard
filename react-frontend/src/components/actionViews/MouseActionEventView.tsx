import clsx from "clsx";
import {
  ActionEvent,
  isMouseDownEvent,
  isMouseMoveEvent,
  isMouseScrollEvent,
  isMouseUpEvent,
  MouseActionEvent,
  MouseButtonDownActionEvent,
  MouseButtonUpActionEvent,
} from "../../api/devices.ts";
import { Input } from "@headlessui/react";
import { InputClassName } from "../Input.tsx";
import { MouseIcon } from "../../assets/sharedIcons.tsx";
import { MouseKeySelector } from "../KeySelector.tsx";
import {
  ActionEventIcon,
  KeyUpDownToggle,
  UnknownActionEventView,
} from "./shared.tsx";

export function MouseActionEventView({
  event,
  setAction,
}: {
  event: MouseActionEvent;
  setAction?: (event: ActionEvent) => void;
}) {
  const setEvent = setAction
    ? (mouse: MouseActionEvent) => setAction({ mouse })
    : undefined;
  return (
    <>
      <ActionEventIcon setAction={setAction}>
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
