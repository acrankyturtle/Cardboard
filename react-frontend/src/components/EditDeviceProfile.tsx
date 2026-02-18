import clsx from "clsx";
import { TagsPanel } from "./editProfile/TagsPanel.tsx";
import { KeysPanel, KeyViewPanel, VirtualKeyPanel } from "./editProfile/KeysPanel.tsx";
import { LayersPanel } from "./editProfile/LayersPanel.tsx";
import { BindingsPanel } from "./editProfile/BindingsPanel.tsx";
import { MacrosPanel } from "./editProfile/MacrosPanel.tsx";
import { EditMacroDialog } from "./editProfile/EditMacroDialog.tsx";
import { ImportKeyDialog } from "./editProfile/ImportKeyDialog.tsx";
import { EditTaggedLayerDialog } from "./EditTaggedLayerDialog.tsx";

export function EditDeviceProfile({ className }: { className?: string }) {
  return (
    <>
      <div className={clsx("flex gap-0.5 bg-stone-950", className)}>
        <div className="grid min-w-56 grid-rows-2 flex-col gap-0.5">
          <TagsPanel />
          <KeysPanel showPhysicalKeys showVirtualKeys />
        </div>
        <div className="flex grow flex-col">
          <KeyViewPanel className="m-4 grow" />
          <VirtualKeyPanel className="mx-10 mb-4" />
        </div>
        <div className="grid min-w-96 grid-rows-2 gap-0.5">
          <LayersPanel />
          <BindingsPanel className="min-w-96" />
        </div>
        <MacrosPanel className="min-w-96" />
      </div>
      <EditTaggedLayerDialog />
      <EditMacroDialog />
      <ImportKeyDialog />
    </>
  );
}
