import { Field, Fieldset, Label } from "@headlessui/react";
import { Select, SelectOption } from "./SelectBox.tsx";
import { LayerModel } from "../lib/profileContext.ts";

export function LayerEditor({
  value,
  onChange,
}: {
  value?: LayerModel;
  onChange?: (value: LayerModel) => void;
}) {
  return (
    <Fieldset className="w-96 space-y-8">
      <Field className="flex flex-col gap-1">
        <Label>Macro</Label>
        <Select autoFocus>
          <SelectOption>Test Macro 1</SelectOption>
          <SelectOption>Test Macro 2</SelectOption>
          <SelectOption>Test Macro 3</SelectOption>
        </Select>
      </Field>
    </Fieldset>
  );
}
