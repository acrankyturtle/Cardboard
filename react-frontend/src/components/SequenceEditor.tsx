import { Sequence } from "../api/devices.ts";
import clsx from "clsx";
import { ActionView } from "./ActionView.tsx";
import { ActionTypeMenu } from "./ActionTypeMenu.tsx";
import { Button, getButtonClassName } from "./Button.tsx";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  convertSequenceDownToUp,
  convertSequenceUpToDown,
  canConvertToEndSequence,
  canConvertToStartSequence,
} from "../lib/actionEventUtils.ts";
import { ActionEvent } from "../api/devices.ts";
import { AddIcon } from "../assets/sharedIcons.tsx";
import { Tooltip } from "./Tooltip.tsx";

export function SequenceEditor({
  className,
  type,
  value,
  setValue,
  onCopyToOther,
  transformActionEvent,
}: {
  className?: string;
  type: "start" | "loop" | "end";
  value: Sequence;
  setValue: (v: Sequence) => void;
  /** Callback to copy converted actions to the other sequence (start->end or end->start) */
  onCopyToOther?: (sequence: Sequence) => void;
  /** Transform an action event before inserting (e.g., to default up events to match down events) */
  transformActionEvent?: (event: ActionEvent) => ActionEvent;
}) {
  const { name, className: sequenceClassName } = getSequenceAppearance(type);

  const canCopy = useMemo(() => {
    if (type === "start") {
      return canConvertToEndSequence(value);
    }
    if (type === "end") {
      return canConvertToStartSequence(value);
    }
    return false;
  }, [type, value]);

  const handleCopy = () => {
    if (!onCopyToOther) return;
    if (type === "start") {
      onCopyToOther(convertSequenceDownToUp(value));
    } else if (type === "end") {
      onCopyToOther(convertSequenceUpToDown(value));
    }
  };

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const actionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shouldScrollRef = useRef(false);

  // Scroll newly inserted action into view (centered to show insert buttons above/below)
  useEffect(() => {
    if (editIndex !== null && shouldScrollRef.current) {
      shouldScrollRef.current = false;
      const element = actionRefs.current[editIndex];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [editIndex]);

  const handleInsert = (index: number) => {
    shouldScrollRef.current = true;
    setEditIndex(index);
  };

  const handleEdit = (index: number) => {
    if (editIndex !== index) {
      shouldScrollRef.current = true;
      setEditIndex(index);
    } else {
      setEditIndex(null);
    }
  };

  // handle clicks outside the ActionView being edited to exit edit mode
  useEffect(() => {
    if (editIndex === null) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // don't exit if clicking inside the ActionView being edited
      if (target.closest("[data-editing='true']")) return;
      // don't exit if clicking inside an action type menu
      if (target.closest("[data-action-type-menu]")) return;
      // don't exit if clicking inside a combobox dropdown
      if (target.closest("[data-combobox-options]")) return;
      setEditIndex(null);
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    return () =>
      document.removeEventListener("mousedown", handleMouseDown, true);
  }, [editIndex]);

  return (
    <div
      className={clsx(
        "flex flex-col overflow-x-clip overflow-y-auto rounded-md border border-stone-900 bg-stone-700 shadow-md shadow-black/25",
        className,
      )}
    >
      <div
        className={clsx(
          "rounded-md-t sticky top-0 z-20 flex w-full items-center px-2 py-1",
          sequenceClassName,
        )}
      >
        <div className="grow">{name}</div>
        {type === "start" && canCopy && onCopyToOther && (
          <Tooltip content="Copy to end sequence">
            <button
              className={clsx(
                getButtonClassName({ variant: "ghost", padding: "none" }),
                "size-6 p-0.5",
              )}
              onClick={handleCopy}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 17l-18 0" />
                <path d="M18 4l3 3l-3 3" />
                <path d="M18 20l3 -3l-3 -3" />
                <path d="M21 7l-18 0" />
              </svg>
            </button>
          </Tooltip>
        )}
        {type === "end" && canCopy && onCopyToOther && (
          <Tooltip content="Copy to start sequence">
            <button
              className={clsx(
                getButtonClassName({ variant: "ghost", padding: "none" }),
                "size-6 p-0.5",
              )}
              onClick={handleCopy}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7l18 0" />
                <path d="M6 20l-3 -3l3 -3" />
                <path d="M6 4l-3 3l3 3" />
                <path d="M3 17l18 0" />
              </svg>
            </button>
          </Tooltip>
        )}
      </div>
      {value.actions.length > 0 ? (
        <div className="flex flex-col items-center gap-1 p-1">
          <SmallInsertButton
            className="-mb-0"
            index={0}
            sequence={value}
            setSequence={setValue}
            onInsert={handleInsert}
            transformActionEvent={transformActionEvent}
          />
          {value.actions.map((a, i) => (
            <Fragment key={i}>
              <ActionView
                ref={(el) => {
                  actionRefs.current[i] = el;
                }}
                className="w-full overflow-hidden"
                action={a}
                setAction={
                  editIndex === i
                    ? (newAction) =>
                        setValue({
                          ...value,
                          actions: [
                            ...value.actions.slice(0, i),
                            newAction,
                            ...value.actions.slice(i + 1),
                          ],
                        })
                    : undefined
                }
                onEdit={() => handleEdit(i)}
                onDelete={() =>
                  setValue({
                    ...value,
                    actions: value.actions.filter((_, idx) => idx !== i),
                  })
                }
              />
              <SmallInsertButton
                className={clsx("-my-0")}
                index={i + 1}
                sequence={value}
                setSequence={setValue}
                onInsert={handleInsert}
                transformActionEvent={transformActionEvent}
              />
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="flex grow flex-col items-center gap-1">
          <div className="mt-1 place-self-center text-sm text-stone-400 italic drop-shadow drop-shadow-black/25">
            No actions
          </div>
          <InsertButton
            className={clsx("w-28")}
            iconClassName="size-8"
            index={0}
            sequence={value}
            setSequence={setValue}
            onInsert={handleInsert}
            transformActionEvent={transformActionEvent}
          />
        </div>
      )}
    </div>
  );
}

function SmallInsertButton({
  className,
  sequence,
  setSequence,
  index,
  onInsert,
  transformActionEvent,
}: {
  className?: string;
  sequence: Sequence;
  setSequence: (s: Sequence) => void;
  index: number;
  onInsert?: (index: number) => void;
  transformActionEvent?: (event: ActionEvent) => ActionEvent;
}) {
  return (
    <InsertButton
      className={clsx("z-10 w-10", className)}
      iconClassName="-m-2 size-5"
      index={index}
      sequence={sequence}
      setSequence={setSequence}
      onInsert={onInsert}
      transformActionEvent={transformActionEvent}
    />
  );
}

function InsertButton({
  className,
  iconClassName,
  index,
  sequence,
  setSequence,
  onInsert,
  transformActionEvent,
}: {
  className?: string;
  iconClassName?: string;
  index: number;
  sequence: Sequence;
  setSequence: (s: Sequence) => void;
  onInsert?: (index: number) => void;
  transformActionEvent?: (event: ActionEvent) => ActionEvent;
}) {
  return (
    <ActionTypeMenu
      onSelect={(actionEvent) => {
        const transformedEvent = transformActionEvent
          ? transformActionEvent(actionEvent)
          : actionEvent;
        const newSequence = {
          ...sequence,
          actions: [
            ...sequence.actions.slice(0, index),
            { predelayMs: 0, actionEvent: transformedEvent },
            ...sequence.actions.slice(index),
          ],
        };
        setSequence(newSequence);
        onInsert?.(index);
      }}
    >
      {({ active }) => (
        <Button
          className={className}
          buttonStyle={{ variant: "ghost", isActive: active }}
        >
          <div className={iconClassName}>
            <AddIcon />
          </div>
        </Button>
      )}
    </ActionTypeMenu>
  );
}

const getSequenceAppearance = (
  sequence: "start" | "loop" | "end",
): { name: string; className: string } => {
  switch (sequence) {
    case "start":
      return { name: "Start", className: "bg-green-800" };
    case "loop":
      return { name: "Loop", className: "bg-fuchsia-800" };
    case "end":
      return { name: "End", className: "bg-amber-800" };
  }
};
