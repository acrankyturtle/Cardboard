import { useCallback } from "react";
import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogConfirmButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderDescription,
  DialogHeaderTitle,
} from "../Dialog.tsx";
import { useEditDeviceContext } from "../../lib/editDeviceContext.tsx";
import {
  applyKeyImport,
  MacroConflict,
  MacroResolution,
} from "../../lib/keyImportExport.ts";
import { RadioGroup, Radio, Label, Field } from "@headlessui/react";

const resolutionOptions: { value: MacroResolution; label: string }[] = [
  { value: "duplicate", label: "Duplicate (keep both)" },
  { value: "useExisting", label: "Use existing" },
  { value: "overwrite", label: "Overwrite with imported" },
];

export function ImportKeyDialog() {
  const { state, dispatch } = useEditDeviceContext();

  const modal = state.modal;
  const isOpen =
    modal !== null && modal.type === "importKey" && modal.show === true;

  const conflicts =
    modal !== null && modal.type === "importKey" ? modal.conflicts : [];
  const keyExport =
    modal !== null && modal.type === "importKey" ? modal.keyExport : null;

  const closeModal = useCallback(() => {
    dispatch({ type: "setModal", modal: null });
  }, [dispatch]);

  const updateResolution = (index: number, resolution: MacroResolution) => {
    if (!modal || modal.type !== "importKey") return;
    const updated = modal.conflicts.map((c, i) =>
      i === index ? { ...c, resolution } : c,
    );
    dispatch({
      type: "setModal",
      modal: { ...modal, conflicts: updated },
    });
  };

  const handleImport = () => {
    if (!keyExport || !state.selectedKey) return;
    const updatedProfile = applyKeyImport(
      state.selectedKey,
      keyExport,
      conflicts,
      state.profile,
    );
    dispatch({ type: "setProfile", profile: updatedProfile });
    dispatch({ type: "setModal", modal: null });
  };

  return (
    <Dialog className="w-2xl" open={isOpen} onClose={closeModal}>
      <DialogHeader>
        <DialogHeaderTitle>Import Key</DialogHeaderTitle>
        <DialogHeaderDescription>
          {conflicts.length} macro{conflicts.length !== 1 ? "s" : ""} with
          conflicting IDs found. Choose how to resolve each.
        </DialogHeaderDescription>
      </DialogHeader>
      <DialogDivider />
      <DialogBody className="max-h-96 overflow-y-auto">
        {conflicts.map((conflict, index) => (
          <ConflictItem
            key={conflict.imported.id}
            conflict={conflict}
            onChange={(resolution) => updateResolution(index, resolution)}
          />
        ))}
      </DialogBody>
      <DialogFooter className="justify-end">
        <DialogConfirmButton onClick={handleImport}>Import</DialogConfirmButton>
        <DialogCancelButton onClick={closeModal}>Cancel</DialogCancelButton>
      </DialogFooter>
    </Dialog>
  );
}

function ConflictItem({
  conflict,
  onChange,
}: {
  conflict: MacroConflict;
  onChange: (resolution: MacroResolution) => void;
}) {
  return (
    <div className="rounded-lg border border-stone-600 bg-stone-800 p-3">
      <div className="mb-2 font-semibold text-stone-200">
        {conflict.imported.name}
      </div>
      <RadioGroup value={conflict.resolution} onChange={onChange}>
        <div className="flex flex-col gap-1">
          {resolutionOptions.map((option) => (
            <Field key={option.value} className="flex items-center gap-2">
              <Radio
                value={option.value}
                className="group flex size-4 shrink-0 items-center justify-center rounded-full border border-stone-500 bg-stone-700 data-checked:border-violet-400"
              >
                <span className="invisible size-2 rounded-full bg-violet-400 group-data-checked:visible" />
              </Radio>
              <Label className="cursor-pointer text-sm text-stone-300">
                {option.label}
              </Label>
            </Field>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
