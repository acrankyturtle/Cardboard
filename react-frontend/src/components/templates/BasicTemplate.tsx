import { useState } from "react";
import { Action } from "../../api/devices.ts";
import {
  TemplateAction,
  TemplateResult,
  templateActionToEvents,
  eventsEqual,
  tryParseDownEvent,
} from "./templateUtils.ts";
import { TemplateLayout, ActionList, TemplatePreview } from "./templateShared.tsx";

export interface ParsedBasicTemplate {
  actions: TemplateAction[];
}

export function BasicTemplateEditor({
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
    onApply(buildBasicTemplate(actions));
  };

  const preview = actions.length > 0 ? buildBasicTemplate(actions) : null;

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

export function buildBasicTemplate(actions: TemplateAction[]): TemplateResult {
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

export function tryParseBasicTemplate(
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
