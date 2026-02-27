import {
  ActionEvent,
  ConsumerControlEvent,
  KeyboardKey,
  MouseButton,
} from "../api/devices.ts";
import clsx from "clsx";
import {
  ConsumerControlIcon,
  DebugIcon,
  KeyboardIcon,
  LayerIcon,
  MouseIcon,
} from "../assets/sharedIcons.tsx";
import { getButtonClassName } from "./Button.tsx";
import {
  Menu,
  MenuButton,
  MenuHeading,
  MenuItem,
  MenuItems,
  MenuSection,
} from "@headlessui/react";
import { Fragment, ReactNode } from "react";

const showDebugActions = import.meta.env.VITE_DEBUG_ACTIONS === "true";

export function ActionTypeMenu({
  children,
  onSelect,
}: {
  children: ReactNode | ((props: { active: boolean }) => ReactNode);
  onSelect: (actionEvent: ActionEvent) => void;
}) {
  return (
    <Menu>
      {({ open }) => (
        <>
          <MenuButton as={Fragment}>
            {typeof children === "function"
              ? children({ active: open })
              : children}
          </MenuButton>
          <ActionTypeMenuItems onSelect={onSelect} />
        </>
      )}
    </Menu>
  );
}

export function ActionTypeMenuItems({
  className,
  onSelect,
}: {
  className?: string;
  onSelect: (actionEvent: ActionEvent) => void;
}) {
  return (
    <MenuItems
      anchor={{ to: "bottom start", gap: 4 }}
      as="div"
      data-action-type-menu
      className={clsx(
        "z-50 min-w-36 rounded border border-stone-950 bg-stone-800 text-stone-50 shadow-md shadow-black/25 select-none",
        className,
      )}
    >
      <ActionTypeGroup
        header={
          <>
            <ActionTypeGroupIcon>
              <KeyboardIcon />
            </ActionTypeGroupIcon>
            <div>Keyboard</div>
          </>
        }
        items={[
          {
            render: <div>Key Down</div>,
            actionEvent: { keyboard: { keyDown: KeyboardKey.A } },
          },
          {
            render: <div>Key Up</div>,
            actionEvent: { keyboard: { keyUp: KeyboardKey.A } },
          },
        ]}
        onSelect={onSelect}
      />
      <ActionTypeGroup
        header={
          <>
            <ActionTypeGroupIcon>
              <MouseIcon />
            </ActionTypeGroupIcon>
            <div>Mouse</div>
          </>
        }
        items={[
          {
            render: <div>Button Down</div>,
            actionEvent: { mouse: { buttonDown: MouseButton.Left } },
          },
          {
            render: <div>Button Up</div>,
            actionEvent: { mouse: { buttonUp: MouseButton.Left } },
          },
          {
            render: <div>Scroll</div>,
            actionEvent: { mouse: { scroll: { x: 0, y: 0 } } },
          },
          {
            render: <div>Move</div>,
            actionEvent: { mouse: { move: { x: 0, y: 0 } } },
          },
        ]}
        onSelect={onSelect}
      />
      <ActionTypeGroup
        header={
          <>
            <ActionTypeGroupIcon>
              <ConsumerControlIcon />
            </ActionTypeGroupIcon>
            <div>Consumer Control</div>
          </>
        }
        items={[
          {
            render: <div>Press</div>,
            actionEvent: { consumerControl: ConsumerControlEvent.PLAY_PAUSE },
          },
        ]}
        onSelect={onSelect}
      />
      <ActionTypeGroup
        header={
          <>
            <ActionTypeGroupIcon>
              <LayerIcon />
            </ActionTypeGroupIcon>
            <div>Layer</div>
          </>
        }
        items={[
          {
            render: <div>Set Layer</div>,
            actionEvent: { layer: { set: "" } },
          },
          {
            render: <div>Clear Layer</div>,
            actionEvent: { layer: { clear: "" } },
          },
        ]}
        onSelect={onSelect}
      />
      {showDebugActions && (
        <ActionTypeGroup
          header={
            <>
              <ActionTypeGroupIcon>
                <DebugIcon />
              </ActionTypeGroupIcon>
              <div>Debug</div>
            </>
          }
          items={[
            {
              render: <div>Log Message</div>,
              actionEvent: { debug: { log: "" } },
            },
          ]}
          onSelect={onSelect}
        />
      )}
    </MenuItems>
  );
}

function ActionTypeGroupIcon({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <div className={clsx("size-5", className)}>{children}</div>;
}

function ActionTypeGroup<T extends ActionEvent>({
  header,
  items,
  onSelect,
}: {
  header: ReactNode;
  items: readonly { render: ReactNode; actionEvent: T }[];
  onSelect: (actionEvent: ActionEvent) => void;
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
          <ActionTypeMenuItem
            key={i}
            onClick={() => onSelect(item.actionEvent)}
          >
            {item.render}
          </ActionTypeMenuItem>
        ))}
      </div>
    </MenuSection>
  );
}

function ActionTypeMenuItem({
  children,
  onClick,
}: {
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <MenuItem>
      <button
        className={clsx(getButtonClassName({ variant: "navbar" }))}
        onClick={onClick}
      >
        {children}
      </button>
    </MenuItem>
  );
}
