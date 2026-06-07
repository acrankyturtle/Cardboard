import clsx from "clsx";
import { useState } from "react";
import {
  ActionEvent,
  GamepadActionEvent,
  GamepadButtonDownActionEvent,
  GamepadButtonUpActionEvent,
  GamepadAdjustActionEvent,
  isGamepadButtonDownEvent,
  isGamepadButtonUpEvent,
  isGamepadAdjustEvent,
} from "../../api/devices.ts";
import { Input } from "@headlessui/react";
import { InputClassName } from "../Input.tsx";
import { GamepadIcon } from "../../assets/sharedIcons.tsx";
import {
  GamepadAxisSelector,
  GamepadKeySelector,
} from "../keySelectors/GamepadKeySelector.tsx";
import {
  ActionEventIcon,
  KeyUpDownToggle,
  UnknownActionEventView,
} from "./shared.tsx";

const AXIS_MIN = -127;
const AXIS_MAX = 127;

function AxisValueInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      type="text"
      inputMode="numeric"
      className={clsx("w-16", InputClassName)}
      value={draft ?? String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw === "" || raw === "-") return;
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return;
        onChange(Math.max(AXIS_MIN, Math.min(AXIS_MAX, Math.round(parsed))));
      }}
      onBlur={() => setDraft(null)}
      aria-label="Axis value"
    />
  );
}

export function GamepadActionEventView({
  event,
  setAction,
}: {
  event: GamepadActionEvent;
  setAction?: (event: ActionEvent) => void;
}) {
  const setEvent = setAction
    ? (gamepad: GamepadActionEvent) => setAction({ gamepad })
    : undefined;
  return (
    <>
      <ActionEventIcon setAction={setAction}>
        <GamepadIcon />
      </ActionEventIcon>
      {isGamepadButtonDownEvent(event) ? (
        <GamepadDownActionEventView event={event} setEvent={setEvent} />
      ) : isGamepadButtonUpEvent(event) ? (
        <GamepadUpActionEventView event={event} setEvent={setEvent} />
      ) : isGamepadAdjustEvent(event) ? (
        <GamepadAdjustActionEventView event={event} setEvent={setEvent} />
      ) : (
        <UnknownActionEventView event={event} />
      )}
    </>
  );
}

function GamepadDownActionEventView({
  event,
  setEvent,
}: {
  event: GamepadButtonDownActionEvent;
  setEvent?: (event: GamepadActionEvent) => void;
}) {
  return (
    <>
      <KeyUpDownToggle
        value="down"
        onChange={
          setEvent ? () => setEvent({ buttonUp: event.buttonDown }) : undefined
        }
      />
      <GamepadKeySelector
        value={event.buttonDown}
        onChange={
          setEvent ? (buttonDown) => setEvent({ buttonDown }) : undefined
        }
      />
    </>
  );
}

function GamepadUpActionEventView({
  event,
  setEvent,
}: {
  event: GamepadButtonUpActionEvent;
  setEvent?: (event: GamepadActionEvent) => void;
}) {
  return (
    <>
      <KeyUpDownToggle
        value="up"
        onChange={
          setEvent ? () => setEvent({ buttonDown: event.buttonUp }) : undefined
        }
      />
      <GamepadKeySelector
        value={event.buttonUp}
        onChange={setEvent ? (buttonUp) => setEvent({ buttonUp }) : undefined}
      />
    </>
  );
}

function GamepadAdjustActionEventView({
  event,
  setEvent,
}: {
  event: GamepadAdjustActionEvent;
  setEvent?: (event: GamepadActionEvent) => void;
}) {
  return (
    <>
      <div>Axis</div>
      <GamepadAxisSelector
        value={event.adjust.axis}
        onChange={
          setEvent
            ? (axis) => setEvent({ adjust: { ...event.adjust, axis } })
            : undefined
        }
      />
      {setEvent ? (
        <AxisValueInput
          value={event.adjust.value}
          onChange={(value) => setEvent({ adjust: { ...event.adjust, value } })}
        />
      ) : (
        <div>{event.adjust.value}</div>
      )}
    </>
  );
}
