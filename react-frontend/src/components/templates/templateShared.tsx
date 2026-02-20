import { ReactNode } from "react";
import clsx from "clsx";
import {
  ConsumerControlEvent,
  KeyboardKey,
  MouseButton,
  Sequence,
} from "../../api/devices.ts";
import { Button, getButtonClassName } from "../Button.tsx";
import {
  Input,
  Menu,
  MenuButton as HeadlessMenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { InputClassName } from "../Input.tsx";
import {
  ConsumerControlKeySelector,
  KeyboardKeySelector,
  MouseKeySelector,
} from "../KeySelector.tsx";
import { ActionView } from "../ActionView.tsx";
import { TemplateAction, TemplateResult } from "./templateUtils.ts";

export function TemplateLayout({
  title,
  description,
  onBack,
  onApply,
  canApply,
  children,
}: {
  title: string;
  description: string;
  onBack: () => void;
  onApply: () => void;
  canApply: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex size-full flex-col gap-3 rounded-md bg-stone-700 p-3 shadow-md shadow-black/25">
      <div className="flex items-center gap-2">
        <button
          className={clsx(
            "size-8 p-1",
            getButtonClassName({ variant: "ghost" }),
          )}
          onClick={onBack}
        >
          <BackIcon />
        </button>
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-xs text-stone-400">{description}</div>
        </div>
      </div>

      {children}

      <div className="flex justify-end gap-2">
        <Button buttonStyle={{ variant: "ghost" }} onClick={onBack}>
          Back
        </Button>
        <Button
          className="min-w-20"
          buttonStyle={{ variant: "submit" }}
          onClick={onApply}
          disabled={!canApply}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

export function ActionList({
  actions,
  setActions,
  allowLayers,
}: {
  actions: TemplateAction[];
  setActions: (actions: TemplateAction[]) => void;
  allowLayers: boolean;
}) {
  const addAction = (action: TemplateAction) => {
    setActions([...actions, action]);
  };

  const updateAction = (index: number, action: TemplateAction) => {
    setActions(actions.map((a, i) => (i === index ? action : a)));
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="flex min-w-72 flex-col gap-2">
      <div className="text-sm font-medium">Actions</div>
      <div className="flex grow flex-col gap-1 overflow-y-auto rounded border border-stone-700 bg-stone-900 p-2">
        {actions.length === 0 ? (
          <div className="text-sm text-stone-500 italic">No actions added</div>
        ) : (
          actions.map((action, i) => (
            <ActionItem
              key={i}
              action={action}
              onChange={(a) => updateAction(i, a)}
              onRemove={() => removeAction(i)}
            />
          ))
        )}
      </div>
      <Menu>
        {({ open }) => (
          <>
            <HeadlessMenuButton
              as={Button}
              className="mb-0.5 min-w-36 self-end"
              buttonStyle={{ variant: "ghost", isActive: open }}
            >
              Add Action
            </HeadlessMenuButton>
            <MenuItems
              anchor="top start"
              className="z-50 flex flex-col gap-1 rounded-md border border-stone-700 bg-stone-800 p-1 text-stone-200 shadow-lg"
            >
              <ActionMenuItem
                onClick={() =>
                  addAction({ type: "keyboard", key: KeyboardKey.A })
                }
              >
                Keyboard Key
              </ActionMenuItem>
              <ActionMenuItem
                onClick={() =>
                  addAction({ type: "mouseButton", button: MouseButton.Left })
                }
              >
                Mouse Button
              </ActionMenuItem>
              <ActionMenuItem
                onClick={() => addAction({ type: "mouseScroll", x: 0, y: 1 })}
              >
                Mouse Scroll
              </ActionMenuItem>
              <ActionMenuItem
                onClick={() => addAction({ type: "mouseMove", x: 0, y: 0 })}
              >
                Mouse Move
              </ActionMenuItem>
              <ActionMenuItem
                onClick={() =>
                  addAction({
                    type: "consumerControl",
                    control: ConsumerControlEvent.PLAY_PAUSE,
                  })
                }
              >
                Media Control
              </ActionMenuItem>
              {allowLayers && (
                <ActionMenuItem
                  onClick={() => addAction({ type: "layer", tag: "" })}
                >
                  Set Layer
                </ActionMenuItem>
              )}
            </MenuItems>
          </>
        )}
      </Menu>
    </div>
  );
}

function ActionMenuItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <MenuItem>
      <button
        className="rounded px-3 py-1.5 text-left text-sm data-focus:bg-stone-700"
        onClick={onClick}
      >
        {children}
      </button>
    </MenuItem>
  );
}

function ActionItem({
  action,
  onChange,
  onRemove,
}: {
  action: TemplateAction;
  onChange: (action: TemplateAction) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded bg-stone-800 px-2 py-1.5">
      <div className="grow">
        <ActionEditor action={action} onChange={onChange} />
      </div>
      <button
        className="text-stone-400 hover:text-stone-200"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
}

function ActionEditor({
  action,
  onChange,
}: {
  action: TemplateAction;
  onChange: (action: TemplateAction) => void;
}) {
  switch (action.type) {
    case "keyboard":
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Key:</span>
          <KeyboardKeySelector
            value={action.key}
            onChange={(key) => onChange({ ...action, key })}
          />
        </div>
      );
    case "mouseButton":
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Button:</span>
          <MouseKeySelector
            value={action.button}
            onChange={(button) => onChange({ ...action, button })}
          />
        </div>
      );
    case "mouseScroll":
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Scroll:</span>
          <Input
            type="number"
            className={clsx("w-16", InputClassName)}
            value={action.x}
            onChange={(e) =>
              onChange({ ...action, x: parseInt(e.target.value) || 0 })
            }
            placeholder="X"
          />
          <Input
            type="number"
            className={clsx("w-16", InputClassName)}
            value={action.y}
            onChange={(e) =>
              onChange({ ...action, y: parseInt(e.target.value) || 0 })
            }
            placeholder="Y"
          />
        </div>
      );
    case "mouseMove":
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Move:</span>
          <Input
            type="number"
            className={clsx("w-16", InputClassName)}
            value={action.x}
            onChange={(e) =>
              onChange({ ...action, x: parseInt(e.target.value) || 0 })
            }
            placeholder="X"
          />
          <Input
            type="number"
            className={clsx("w-16", InputClassName)}
            value={action.y}
            onChange={(e) =>
              onChange({ ...action, y: parseInt(e.target.value) || 0 })
            }
            placeholder="Y"
          />
        </div>
      );
    case "consumerControl":
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Media:</span>
          <ConsumerControlKeySelector
            value={action.control}
            onChange={(control) => onChange({ ...action, control })}
          />
        </div>
      );
    case "layer":
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Layer:</span>
          <Input
            type="text"
            className={clsx("w-32", InputClassName)}
            value={action.tag}
            onChange={(e) => onChange({ ...action, tag: e.target.value })}
            placeholder="Tag name"
          />
        </div>
      );
  }
}

export function TemplatePreview({
  preview,
}: {
  preview: TemplateResult | null;
}) {
  return (
    <div className="flex grow flex-col gap-2">
      <div className="text-sm font-medium">Preview</div>
      <div className="grow overflow-y-auto rounded border border-stone-700 bg-stone-900 p-2">
        {preview ? (
          <div className="flex flex-col gap-3 text-xs">
            <SequencePreview
              name="Start"
              sequence={preview.start}
              color="bg-green-800"
            />
            <SequencePreview
              name="Loop"
              sequence={preview.loop}
              color="bg-fuchsia-800"
            />
            <SequencePreview
              name="End"
              sequence={preview.end}
              color="bg-amber-800"
            />
          </div>
        ) : (
          <div className="text-sm text-stone-500 italic">
            No actions generated
          </div>
        )}
      </div>
    </div>
  );
}

function SequencePreview({
  name,
  sequence,
  color,
}: {
  name: string;
  sequence: Sequence;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className={clsx("rounded px-2 py-0.5 text-xs font-medium", color)}>
        {name}
      </div>
      {sequence.actions.length === 0 ? (
        <div className="pl-2 text-stone-500 italic">Empty</div>
      ) : (
        <div className="flex flex-col gap-0.5 pl-2">
          {sequence.actions.map((action, i) => (
            <div key={i} className="flex items-center gap-2">
              {action.predelayMs > 0 && (
                <span className="text-xs text-stone-500">
                  +{action.predelayMs}ms →
                </span>
              )}
              <ActionView action={action} compact />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 6l-6 6l6 6" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TemplateCard({
  className,
  title,
  description,
  onClick,
  showCheckmark,
}: {
  className?: string;
  title: ReactNode;
  description: ReactNode;
  onClick: () => void;
  showCheckmark?: boolean;
}) {
  return (
    <button
      className={clsx(
        "relative flex h-24 w-56 flex-col items-center justify-center rounded-2xl shadow-md shadow-black/25",
        getButtonClassName({ rounded: "none", variant: "no-color" }),
        className,
      )}
      onClick={onClick}
    >
      {showCheckmark && (
        <div className="absolute top-2 right-2 size-5 rounded-full bg-green-600 p-0.5 text-white">
          <CheckIcon />
        </div>
      )}
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-xs text-stone-400">{description}</div>
    </button>
  );
}
