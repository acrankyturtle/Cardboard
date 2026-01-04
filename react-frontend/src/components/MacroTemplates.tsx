import { ReactNode, useState } from "react";
import clsx from "clsx";
import {
  Action,
  ActionEvent,
  ConsumerControlEvent,
  KeyboardKey,
  MouseButton,
  Sequence,
} from "../api/devices.ts";
import { Button, getButtonClassName } from "./Button.tsx";
import {
  Field,
  Input,
  Label,
  Menu,
  MenuButton as HeadlessMenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { InputClassName } from "./Input.tsx";
import {
  ConsumerControlKeySelector,
  KeyboardKeySelector,
  MouseKeySelector,
} from "./KeySelector.tsx";
import { ActionView } from "./ActionView.tsx";

export type TemplateType = "basic" | "rapidFire";

export interface TemplateResult {
  start: Sequence;
  loop: Sequence;
  end: Sequence;
}

export type TemplateAction =
  | { type: "keyboard"; key: KeyboardKey }
  | { type: "mouseButton"; button: MouseButton }
  | { type: "mouseScroll"; x: number; y: number }
  | { type: "mouseMove"; x: number; y: number }
  | { type: "consumerControl"; control: ConsumerControlEvent }
  | { type: "layer"; tag: string };

export function TemplatePanel({
  setMacro,
  onEditingChange,
  currentMacro,
  onSwitchToSequences,
}: {
  setMacro: (result: TemplateResult) => void;
  onEditingChange?: (isEditing: boolean) => void;
  currentMacro?: TemplateResult;
  onSwitchToSequences?: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(
    null,
  );

  // Try to parse current macro into template format
  const parsedBasic = currentMacro ? tryParseBasicTemplate(currentMacro) : null;
  const parsedRapidFire = currentMacro
    ? tryParseRapidFireTemplate(currentMacro)
    : null;

  const selectTemplate = (type: TemplateType) => {
    setSelectedTemplate(type);
    onEditingChange?.(true);
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    onEditingChange?.(false);
  };

  if (selectedTemplate === null) {
    return (
      <TemplateSelector
        onSelect={selectTemplate}
        basicMatches={parsedBasic !== null}
        rapidFireMatches={parsedRapidFire !== null}
      />
    );
  }

  // Get initial values from parsed template if available
  const initialActions =
    selectedTemplate === "basic"
      ? parsedBasic?.actions
      : parsedRapidFire?.actions;
  const initialTiming =
    selectedTemplate === "rapidFire" ? parsedRapidFire?.timing : undefined;

  return (
    <TemplateWizard
      templateType={selectedTemplate}
      onBack={clearTemplate}
      onApply={(result) => {
        setMacro(result);
        clearTemplate();
        onSwitchToSequences?.();
      }}
      initialActions={initialActions}
      initialTiming={initialTiming}
    />
  );
}

function TemplateSelector({
  onSelect,
  basicMatches,
  rapidFireMatches,
}: {
  onSelect: (type: TemplateType) => void;
  basicMatches?: boolean;
  rapidFireMatches?: boolean;
}) {
  return (
    <div className="flex size-full flex-wrap items-center justify-center gap-4">
      <TemplateCard
        className="bg-sky-900 hover:bg-sky-800 active:bg-sky-950"
        title="Basic"
        description="Press and release keys"
        onClick={() => onSelect("basic")}
        showCheckmark={basicMatches}
      />
      <TemplateCard
        className="bg-orange-900 hover:bg-orange-800 active:bg-orange-950"
        title="Rapid Fire"
        description="Repeat keys while held"
        onClick={() => onSelect("rapidFire")}
        showCheckmark={rapidFireMatches}
      />
    </div>
  );
}

function TemplateCard({
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TemplateWizard({
  templateType,
  onBack,
  onApply,
  initialActions,
  initialTiming,
}: {
  templateType: TemplateType;
  onBack: () => void;
  onApply: (result: TemplateResult) => void;
  initialActions?: TemplateAction[];
  initialTiming?: { pressDurationMs: number; waitBetweenMs: number };
}) {
  switch (templateType) {
    case "basic":
      return (
        <BasicTemplate
          onBack={onBack}
          onApply={onApply}
          initialActions={initialActions}
        />
      );
    case "rapidFire":
      return (
        <RapidFireTemplate
          onBack={onBack}
          onApply={onApply}
          initialActions={initialActions}
          initialTiming={initialTiming}
        />
      );
  }
}

function BasicTemplate({
  onBack,
  onApply,
  initialActions,
}: {
  onBack: () => void;
  onApply: (result: TemplateResult) => void;
  initialActions?: TemplateAction[];
}) {
  const [actions, setActions] = useState<TemplateAction[]>(
    initialActions ?? [],
  );

  const handleApply = () => {
    if (actions.length === 0) return;
    onApply(generateBasicMacro(actions));
  };

  const preview = actions.length > 0 ? generateBasicMacro(actions) : null;

  return (
    <TemplateLayout
      title="Basic Template"
      description="Create a macro that presses and releases the specified keys/buttons when the key is pressed."
      onBack={onBack}
      onApply={handleApply}
      canApply={actions.length > 0}
    >
      <div className="flex grow gap-4 overflow-hidden">
        <ActionList actions={actions} setActions={setActions} allowLayers />
        <TemplatePreview preview={preview} />
      </div>
    </TemplateLayout>
  );
}

function generateBasicMacro(actions: TemplateAction[]): TemplateResult {
  const startActions: Action[] = [];
  const endActions: Action[] = [];

  for (const action of actions) {
    const { down, up } = templateActionToEvents(action);
    if (down) {
      startActions.push({ predelayMs: 0, actionEvent: down });
    }
    if (up) {
      endActions.push({ predelayMs: 0, actionEvent: up });
    }
  }

  return {
    start: { actions: startActions },
    loop: { actions: [] },
    end: { actions: endActions },
  };
}

function RapidFireTemplate({
  onBack,
  onApply,
  initialActions,
  initialTiming,
}: {
  onBack: () => void;
  onApply: (result: TemplateResult) => void;
  initialActions?: TemplateAction[];
  initialTiming?: { pressDurationMs: number; waitBetweenMs: number };
}) {
  const [actions, setActions] = useState<TemplateAction[]>(
    initialActions ?? [],
  );
  const [pressDurationMs, setPressDurationMs] = useState(
    initialTiming?.pressDurationMs ?? 50,
  );
  const [waitBetweenMs, setWaitBetweenMs] = useState(
    initialTiming?.waitBetweenMs ?? 50,
  );

  const handleApply = () => {
    if (actions.length === 0) return;
    onApply(generateRapidFireMacro(actions, pressDurationMs, waitBetweenMs));
  };

  const preview =
    actions.length > 0
      ? generateRapidFireMacro(actions, pressDurationMs, waitBetweenMs)
      : null;

  return (
    <TemplateLayout
      title="Rapid Fire Template"
      description="Create a macro that repeatedly presses the specified keys/buttons while the key is held."
      onBack={onBack}
      onApply={handleApply}
      canApply={actions.length > 0}
    >
      <div className="flex grow gap-4 overflow-hidden">
        <ActionList
          actions={actions}
          setActions={setActions}
          allowLayers={false}
        />
        <TimingSettings
          pressDurationMs={pressDurationMs}
          setPressDurationMs={setPressDurationMs}
          waitBetweenMs={waitBetweenMs}
          setWaitBetweenMs={setWaitBetweenMs}
        />
        <TemplatePreview preview={preview} />
      </div>
    </TemplateLayout>
  );
}

function generateRapidFireMacro(
  actions: TemplateAction[],
  pressDurationMs: number,
  waitBetweenMs: number,
): TemplateResult {
  const startActions: Action[] = [];
  const loopActions: Action[] = [];
  const endActions: Action[] = [];

  const downEvents: ActionEvent[] = [];
  const upEvents: ActionEvent[] = [];
  const instantEvents: ActionEvent[] = [];

  for (const action of actions) {
    const { down, up, isInstant } = templateActionToEvents(action);
    if (isInstant && down) {
      instantEvents.push(down);
    } else if (down) {
      downEvents.push(down);
      if (up) {
        upEvents.push(up);
      }
    }
  }

  // Start: all down events with no delay
  for (const event of downEvents) {
    startActions.push({ predelayMs: 0, actionEvent: event });
  }
  for (const event of instantEvents) {
    startActions.push({ predelayMs: 0, actionEvent: event });
  }

  // Loop: wait duration → up events → wait between → down events
  if (upEvents.length > 0 || instantEvents.length > 0) {
    let isFirst = true;
    for (const event of upEvents) {
      loopActions.push({
        predelayMs: isFirst ? pressDurationMs : 0,
        actionEvent: event,
      });
      isFirst = false;
    }

    isFirst = true;
    for (const event of downEvents) {
      loopActions.push({
        predelayMs: isFirst ? waitBetweenMs : 0,
        actionEvent: event,
      });
      isFirst = false;
    }
    for (const event of instantEvents) {
      loopActions.push({
        predelayMs: isFirst ? waitBetweenMs : 0,
        actionEvent: event,
      });
      isFirst = false;
    }
  }

  // End: wait duration → up events
  let isFirst = true;
  for (const event of upEvents) {
    endActions.push({
      predelayMs: isFirst ? pressDurationMs : 0,
      actionEvent: event,
    });
    isFirst = false;
  }

  return {
    start: { actions: startActions },
    loop: { actions: loopActions },
    end: { actions: endActions },
  };
}

function TemplateLayout({
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

function TimingSettings({
  pressDurationMs,
  setPressDurationMs,
  waitBetweenMs,
  setWaitBetweenMs,
}: {
  pressDurationMs: number;
  setPressDurationMs: (v: number) => void;
  waitBetweenMs: number;
  setWaitBetweenMs: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium">Timing</div>
      <Field className="flex flex-col gap-1">
        <Label className="text-xs text-stone-400">Press Duration (ms)</Label>
        <Input
          className={clsx("w-32", InputClassName)}
          type="number"
          min={0}
          max={10000}
          value={pressDurationMs}
          onChange={(e) => setPressDurationMs(parseInt(e.target.value) || 0)}
        />
      </Field>
      <Field className="flex flex-col gap-1">
        <Label className="text-xs text-stone-400">Wait Between (ms)</Label>
        <Input
          className={clsx("w-32", InputClassName)}
          type="number"
          min={0}
          max={10000}
          value={waitBetweenMs}
          onChange={(e) => setWaitBetweenMs(parseInt(e.target.value) || 0)}
        />
      </Field>
    </div>
  );
}

function ActionList({
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

function TemplatePreview({ preview }: { preview: TemplateResult | null }) {
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

function templateActionToEvents(action: TemplateAction): {
  down: ActionEvent | null;
  up: ActionEvent | null;
  isInstant: boolean;
} {
  switch (action.type) {
    case "keyboard":
      return {
        down: { keyboard: { keyDown: action.key } },
        up: { keyboard: { keyUp: action.key } },
        isInstant: false,
      };
    case "mouseButton":
      return {
        down: { mouse: { buttonDown: action.button } },
        up: { mouse: { buttonUp: action.button } },
        isInstant: false,
      };
    case "mouseScroll":
      return {
        down: { mouse: { scroll: { x: action.x, y: action.y } } },
        up: null,
        isInstant: true,
      };
    case "mouseMove":
      return {
        down: { mouse: { move: { x: action.x, y: action.y } } },
        up: null,
        isInstant: true,
      };
    case "consumerControl":
      return {
        down: { consumerControl: action.control },
        up: null,
        isInstant: true,
      };
    case "layer":
      return {
        down: { layer: { set: action.tag } },
        up: { layer: { clear: action.tag } },
        isInstant: false,
      };
  }
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

interface ParsedBasicTemplate {
  actions: TemplateAction[];
}

interface ParsedRapidFireTemplate {
  actions: TemplateAction[];
  timing: { pressDurationMs: number; waitBetweenMs: number };
}

function tryParseBasicTemplate(
  macro: TemplateResult,
): ParsedBasicTemplate | null {
  // Basic template requirements:
  // - Loop must be empty
  // - Start must have only down events with no delays
  // - End must have matching up events with no delays
  if (macro.loop.actions.length > 0) return null;

  const actions: TemplateAction[] = [];

  for (const action of macro.start.actions) {
    if (action.predelayMs !== 0) return null;
    const parsed = tryParseDownEvent(action.actionEvent);
    if (!parsed) return null;
    actions.push(parsed);
  }

  // Verify end sequence has matching up events
  if (macro.end.actions.length !== actions.length) return null;
  for (let i = 0; i < actions.length; i++) {
    const endAction = macro.end.actions[i];
    if (endAction.predelayMs !== 0) return null;
    const expectedUp = templateActionToEvents(actions[i]).up;
    if (!expectedUp || !eventsEqual(endAction.actionEvent, expectedUp)) {
      return null;
    }
  }

  return actions.length > 0 ? { actions } : null;
}

function tryParseRapidFireTemplate(
  macro: TemplateResult,
): ParsedRapidFireTemplate | null {
  // Rapid Fire template requirements:
  // - Start has down events with no delays
  // - Loop has: (predelay) up events → (predelay) down events
  // - End has: (predelay) up events
  // - All predelays must be consistent

  // Parse start sequence - should have down events with no delay
  const actions: TemplateAction[] = [];
  for (const action of macro.start.actions) {
    if (action.predelayMs !== 0) return null;
    const parsed = tryParseDownEvent(action.actionEvent);
    if (!parsed) return null;
    // Rapid fire doesn't support layer events
    if (parsed.type === "layer") return null;
    actions.push(parsed);
  }

  if (actions.length === 0) return null;

  // Separate instant vs down/up actions
  const nonInstantActions = actions.filter(
    (a) => !templateActionToEvents(a).isInstant,
  );

  // If no non-instant actions, can't have meaningful timing
  if (nonInstantActions.length === 0) return null;

  // Parse loop sequence
  // Expected pattern: up events (first with predelay = pressDuration) → down events (first with predelay = waitBetween)
  const expectedUpEvents = nonInstantActions.length;
  const expectedDownEvents = actions.length;

  if (macro.loop.actions.length !== expectedUpEvents + expectedDownEvents) {
    return null;
  }

  // First half should be up events
  let pressDurationMs = 0;
  for (let i = 0; i < expectedUpEvents; i++) {
    const loopAction = macro.loop.actions[i];
    if (i === 0) {
      pressDurationMs = loopAction.predelayMs;
    } else if (loopAction.predelayMs !== 0) {
      return null;
    }
    const expectedUp = templateActionToEvents(nonInstantActions[i]).up;
    if (!expectedUp || !eventsEqual(loopAction.actionEvent, expectedUp)) {
      return null;
    }
  }

  // Second half should be down events
  let waitBetweenMs = 0;
  for (let i = 0; i < expectedDownEvents; i++) {
    const loopAction = macro.loop.actions[expectedUpEvents + i];
    if (i === 0) {
      waitBetweenMs = loopAction.predelayMs;
    } else if (loopAction.predelayMs !== 0) {
      return null;
    }
    const expectedDown = templateActionToEvents(actions[i]).down;
    if (!expectedDown || !eventsEqual(loopAction.actionEvent, expectedDown)) {
      return null;
    }
  }

  // Verify end sequence
  if (macro.end.actions.length !== expectedUpEvents) return null;
  for (let i = 0; i < expectedUpEvents; i++) {
    const endAction = macro.end.actions[i];
    if (i === 0) {
      if (endAction.predelayMs !== pressDurationMs) return null;
    } else if (endAction.predelayMs !== 0) {
      return null;
    }
    const expectedUp = templateActionToEvents(nonInstantActions[i]).up;
    if (!expectedUp || !eventsEqual(endAction.actionEvent, expectedUp)) {
      return null;
    }
  }

  return {
    actions,
    timing: { pressDurationMs, waitBetweenMs },
  };
}

function tryParseDownEvent(event: ActionEvent): TemplateAction | null {
  if ("keyboard" in event && "keyDown" in event.keyboard) {
    return { type: "keyboard", key: event.keyboard.keyDown };
  }
  if ("mouse" in event) {
    if ("buttonDown" in event.mouse) {
      return { type: "mouseButton", button: event.mouse.buttonDown };
    }
    if ("scroll" in event.mouse) {
      return {
        type: "mouseScroll",
        x: event.mouse.scroll.x,
        y: event.mouse.scroll.y,
      };
    }
    if ("move" in event.mouse) {
      return {
        type: "mouseMove",
        x: event.mouse.move.x,
        y: event.mouse.move.y,
      };
    }
  }
  if ("consumerControl" in event) {
    return { type: "consumerControl", control: event.consumerControl };
  }
  if ("layer" in event && "set" in event.layer) {
    return { type: "layer", tag: event.layer.set };
  }
  return null;
}

function eventsEqual(a: ActionEvent, b: ActionEvent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
