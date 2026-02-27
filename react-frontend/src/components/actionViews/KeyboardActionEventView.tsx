import {
  ActionEvent,
  isKeyDownEvent,
  isKeyUpEvent,
  KeyboardActionEvent,
  KeyboardKeyDownActionEvent,
  KeyboardKeyUpActionEvent,
} from "../../api/devices.ts";
import { KeyboardIcon } from "../../assets/sharedIcons.tsx";
import { KeyboardKeySelector } from "../keySelectors/KeyboardKeySelector.tsx";
import {
  ActionEventIcon,
  KeyUpDownToggle,
  UnknownActionEventView,
} from "./shared.tsx";

export function KeyboardActionEventView({
  event,
  setAction,
}: {
  event: KeyboardActionEvent;
  setAction?: (event: ActionEvent) => void;
}) {
  const setEvent = setAction
    ? (keyboard: KeyboardActionEvent) => setAction({ keyboard })
    : undefined;
  return (
    <>
      <ActionEventIcon setAction={setAction}>
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
