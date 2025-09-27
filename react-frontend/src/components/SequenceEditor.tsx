import {
  Action,
  ActionEvent,
  ConsumerControlEvent,
  KeyboardKey,
  MouseButton,
  Sequence,
} from "../api/devices.ts";
import clsx from "clsx";
import {
  ActionView,
  ConsumerControlIcon,
  KeyboardIcon,
  LayerIcon,
  MouseIcon,
} from "./ActionView.tsx";
import { getButtonClassName } from "./Button.tsx";
import {
  Menu,
  MenuButton,
  MenuHeading,
  MenuItem,
  MenuItems,
  MenuSection,
} from "@headlessui/react";
import { Fragment, ReactNode, useState } from "react";

export function SequenceEditor({
  className,
  type,
  value,
  setValue,
}: {
  className?: string;
  type: "start" | "loop" | "end";
  value: Sequence;
  setValue: (v: Sequence) => void;
}) {
  const { name, className: sequenceClassName } = getSequenceAppearance(type);

  const [editIndex, setEditIndex] = useState<number | null>(null);

  return (
    <div
      className={clsx(
        "flex flex-col overflow-x-clip overflow-y-auto rounded-md border border-stone-900 bg-stone-700 shadow-md shadow-black/25",
        className,
      )}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setEditIndex(null);
        }
      }}
    >
      <div
        className={clsx(
          "rounded-md-t sticky top-0 z-20 w-full px-2 py-1",
          sequenceClassName,
        )}
      >
        {name}
      </div>
      {value.actions.length > 0 ? (
        <div className="flex flex-col items-center gap-1 p-1">
          <SmallInsertButton
            className="-mb-0"
            index={0}
            sequence={value}
            setSequence={setValue}
          />
          {value.actions.map((a, i) => {
            return (
              <>
                <ActionView
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
                  onEdit={() => setEditIndex(editIndex !== i ? i : null)}
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
                />
              </>
            );
          })}
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
}: {
  className?: string;
  sequence: Sequence;
  setSequence: (s: Sequence) => void;
  index: number;
}) {
  return (
    <InsertButton
      className={clsx(
        "z-10 w-10",
        //getButtonClassName({ variant: "no-color" }),
        className,
      )}
      iconClassName="-m-2 size-5"
      index={index}
      sequence={sequence}
      setSequence={setSequence}
    />
  );
}

function InsertButton({
  className,
  iconClassName,
  index,
  sequence,
  setSequence,
}: {
  className?: string;
  iconClassName?: string;
  index: number;
  sequence: Sequence;
  setSequence: (s: Sequence) => void;
}) {
  return (
    <Menu>
      <MenuButton as={Fragment}>
        {({ active }) => (
          <div
            className={clsx(
              getButtonClassName({ variant: "ghost", isActive: active }),
              className,
            )}
          >
            <div className={iconClassName}>
              <AddIcon />
            </div>
          </div>
        )}
      </MenuButton>
      <InsertDropdown
        index={index}
        sequence={sequence}
        setSequence={setSequence}
      />
    </Menu>
  );
}

function InsertDropdown({
  className,
  index,
  sequence,
  setSequence,
}: {
  className?: string;
  index: number;
  sequence: Sequence;
  setSequence: (s: Sequence) => void;
}) {
  return (
    <MenuItems
      anchor={{ to: "bottom end", gap: 4 }}
      as="div"
      className={clsx(
        "min-w-36 rounded border border-stone-950 bg-stone-800 text-stone-50 shadow-md shadow-black/25 select-none",
        className,
      )}
    >
      <InsertActionGroup
        header={
          <>
            <InsertActionGroupIcon>
              <KeyboardIcon />
            </InsertActionGroupIcon>
            <div>Keyboard</div>
          </>
        }
        items={[
          {
            render: <div>Key Down</div>,
            newAction: { keyboard: { keyDown: KeyboardKey.A } },
          },
          {
            render: <div>Key Up</div>,
            newAction: { keyboard: { keyUp: KeyboardKey.A } },
          },
        ]}
        index={index}
        sequence={sequence}
        setSequence={setSequence}
      />
      <InsertActionGroup
        header={
          <>
            <InsertActionGroupIcon>
              <MouseIcon />
            </InsertActionGroupIcon>
            <div>Mouse</div>
          </>
        }
        items={[
          {
            render: <div>Button Down</div>,
            newAction: { mouse: { buttonDown: MouseButton.Left } },
          },
          {
            render: <div>Button Up</div>,
            newAction: { mouse: { buttonUp: MouseButton.Left } },
          },
          {
            render: <div>Scroll</div>,
            newAction: { mouse: { scroll: { x: 0, y: 0 } } },
          },
          {
            render: <div>Move</div>,
            newAction: { mouse: { move: { x: 0, y: 0 } } },
          },
        ]}
        index={index}
        sequence={sequence}
        setSequence={setSequence}
      />
      <InsertActionGroup
        header={
          <>
            <InsertActionGroupIcon>
              <ConsumerControlIcon />
            </InsertActionGroupIcon>
            <div>Consumer Control</div>
          </>
        }
        items={[
          {
            render: <div>Press</div>,
            newAction: { consumerControl: ConsumerControlEvent.PLAY_PAUSE },
          },
        ]}
        index={index}
        sequence={sequence}
        setSequence={setSequence}
      />
      <InsertActionGroup
        header={
          <>
            <InsertActionGroupIcon>
              <LayerIcon />
            </InsertActionGroupIcon>
            <div>Layer</div>
          </>
        }
        items={[
          {
            render: <div>Set Layer</div>,
            newAction: { layer: { set: "" } },
          },
          {
            render: <div>Clear Layer</div>,
            newAction: { layer: { clear: "" } },
          },
        ]}
        index={index}
        sequence={sequence}
        setSequence={setSequence}
      />
      {/*<InsertActionGroup*/}
      {/*  header={*/}
      {/*    <>*/}
      {/*      <InsertActionGroupIcon>*/}
      {/*        <DebugIcon />*/}
      {/*      </InsertActionGroupIcon>*/}
      {/*      <div>Debug</div>*/}
      {/*    </>*/}
      {/*  }*/}
      {/*  items={[*/}
      {/*    {*/}
      {/*      render: <div>Log Message</div>,*/}
      {/*      newAction: { debug: { log: "" } },*/}
      {/*    },*/}
      {/*  ]}*/}
      {/*  index={index}*/}
      {/*  sequence={sequence}*/}
      {/*  setSequence={setSequence}*/}
      {/*/>*/}
    </MenuItems>
  );
}

function InsertActionGroupIcon({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <div className={clsx("size-5", className)}>{children}</div>;
}

function InsertActionGroup<T extends ActionEvent>({
  header,
  items,
  index,
  sequence,
  setSequence,
}: {
  header: ReactNode;
  items: readonly { render: ReactNode; newAction: T }[];
  index: number;
  sequence: Sequence;
  setSequence: (s: Sequence) => void;
}) {
  return (
    <MenuSection>
      <MenuHeading
        as="div"
        className="flex items-center gap-2 bg-stone-900 p-2 text-xs"
      >
        {header}
      </MenuHeading>
      <div className="flex gap-1 p-0.5">
        {items.map((item, i) => (
          <InsertDropdownItem
            key={i}
            onClick={() => {
              insertItem(
                { predelayMs: 0, actionEvent: item.newAction },
                index,
                sequence,
                setSequence,
              );
            }}
          >
            {item.render}
          </InsertDropdownItem>
        ))}
      </div>
    </MenuSection>
  );
}

function InsertDropdownItem({
  children,
  onClick,
}: {
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <MenuItem
      as="div"
      className={getButtonClassName({ variant: "navbar" })}
      onClick={onClick}
    >
      {children}
    </MenuItem>
  );
}

const insertItem = (
  action: Action,
  index: number,
  sequence: Sequence,
  setSequence: (s: Sequence) => void,
) => {
  const newSequence = {
    ...sequence,
    actions: [
      ...sequence.actions.slice(0, index),
      action,
      ...sequence.actions.slice(index),
    ],
  };
  setSequence(newSequence);
};

function AddIcon() {
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
      <path d="M12 5l0 14" />
      <path d="M5 12l14 0" />
    </svg>
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
