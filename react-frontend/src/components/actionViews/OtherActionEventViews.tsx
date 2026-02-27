import {
  ActionEvent,
  ConsumerControlEvent,
  DebugActionEvent,
} from "../../api/devices.ts";
import { ConsumerControlIcon, DebugIcon } from "../../assets/sharedIcons.tsx";
import { ConsumerControlKeySelector } from "../keySelectors/ConsumerControlKeySelector.tsx";
import { ActionEventIcon } from "./shared.tsx";

export function ConsumerControlActionEventView({
  event,
  setAction,
}: {
  event: ConsumerControlEvent;
  setAction?: (event: ActionEvent) => void;
}) {
  return (
    <>
      <ActionEventIcon setAction={setAction}>
        <ConsumerControlIcon />
      </ActionEventIcon>
      <ConsumerControlKeySelector
        value={event}
        onChange={
          setAction ? (e) => setAction({ consumerControl: e }) : undefined
        }
      />
    </>
  );
}

export function DebugActionEventView({
  event,
  setAction,
}: {
  event: DebugActionEvent;
  setAction?: (event: ActionEvent) => void;
}) {
  return (
    <>
      <ActionEventIcon setAction={setAction}>
        <DebugIcon />
      </ActionEventIcon>
      <div className="line-clamp-1 text-xs">{event.log}</div>
    </>
  );
}
