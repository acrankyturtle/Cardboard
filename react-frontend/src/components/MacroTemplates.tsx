import { useState } from "react";
import {
  TemplateType,
  TemplateResult,
  TemplateAction,
} from "./templates/templateUtils.ts";
import {
  BasicTemplateEditor,
  tryParseBasicTemplate,
} from "./templates/BasicTemplate.tsx";
import {
  RapidFireTemplateEditor,
  tryParseRapidFireTemplate,
} from "./templates/RapidFireTemplate.tsx";
import { TemplateCard } from "./templates/templateShared.tsx";

export type { TemplateType, TemplateResult, TemplateAction };

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
        <BasicTemplateEditor
          onBack={onBack}
          onApply={onApply}
          initialActions={initialActions}
        />
      );
    case "rapidFire":
      return (
        <RapidFireTemplateEditor
          onBack={onBack}
          onApply={onApply}
          initialActions={initialActions}
          initialTiming={initialTiming}
        />
      );
  }
}
