import clsx from "clsx";
import { useState } from "react";
import { Action, ActionEvent } from "../../api/devices.ts";
import { Field, Input, Label } from "@headlessui/react";
import { InputClassName } from "../Input.tsx";
import {
  TemplateAction,
  TemplateResult,
  templateActionToEvents,
  eventsEqual,
  tryParseDownEvent,
} from "./templateUtils.ts";
import {
  TemplateLayout,
  ActionList,
  TemplatePreview,
} from "./templateShared.tsx";

export interface ParsedRapidFireTemplate {
  actions: TemplateAction[];
  timing: { pressDurationMs: number; waitBetweenMs: number };
}

export function RapidFireTemplateEditor({
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
    onApply(buildRapidFireTemplate(actions, pressDurationMs, waitBetweenMs));
  };

  const preview =
    actions.length > 0
      ? buildRapidFireTemplate(actions, pressDurationMs, waitBetweenMs)
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

export function buildRapidFireTemplate(
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

  // Loop: wait duration -> up events -> wait between -> down events
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

  // End: wait duration -> up events
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

export function tryParseRapidFireTemplate(
  macro: TemplateResult,
): ParsedRapidFireTemplate | null {
  // Rapid Fire template requirements:
  // - Start has down events with no delays
  // - Loop has: (predelay) up events -> (predelay) down events
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
  // Expected pattern: up events (first with predelay = pressDuration) -> down events (first with predelay = waitBetween)
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
