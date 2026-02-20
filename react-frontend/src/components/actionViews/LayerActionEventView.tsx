import { useMemo } from "react";
import {
  ActionEvent,
  isLayerClearEvent,
  isLayerSetEvent,
  LayerActionEvent,
} from "../../api/devices.ts";
import { LayerIcon } from "../../assets/sharedIcons.tsx";
import { LayerTagSelector } from "../KeySelector.tsx";
import {
  getTagsInProfile,
  useMaybeEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import { useAssociations } from "../../api/associations.ts";
import {
  ActionEventIcon,
  KeyUpDownToggle,
  UnknownActionEventView,
} from "./shared.tsx";

export function LayerActionEventView({
  event,
  setAction,
}: {
  event: LayerActionEvent;
  setAction?: (event: ActionEvent) => void;
}) {
  const setEvent = setAction
    ? (layer: LayerActionEvent) => setAction({ layer })
    : undefined;
  const context = useMaybeEditDeviceContext();
  const { associations } = useAssociations();
  const tagItems = useMemo(() => {
    const profileTags = context ? getTagsInProfile(context.state.profile) : [];
    const associationTags = associations.flatMap((a) => a.data.tags);
    return [...new Set([...profileTags, ...associationTags])].sort();
  }, [context, associations]);

  return (
    <>
      <ActionEventIcon setAction={setAction}>
        <LayerIcon className="size-7" />
      </ActionEventIcon>
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
          <LayerTagSelector
            value={event.clear}
            items={tagItems}
            onChange={setEvent ? (v) => setEvent({ clear: v }) : undefined}
          />
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
          <LayerTagSelector
            value={event.set}
            items={tagItems}
            onChange={setEvent ? (v) => setEvent({ set: v }) : undefined}
          />
        </>
      ) : (
        <UnknownActionEventView event={event} />
      )}
    </>
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
