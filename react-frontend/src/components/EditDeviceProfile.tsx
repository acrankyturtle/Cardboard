import clsx from "clsx";
import { useRef, useState, useEffect } from "react";
import { TagsPanel } from "./editProfile/TagsPanel.tsx";
import {
  KeysPanel,
  KeyViewPanel,
  VirtualKeyPanel,
} from "./editProfile/KeysPanel.tsx";
import { LayersPanel } from "./editProfile/LayersPanel.tsx";
import { BindingsPanel } from "./editProfile/BindingsPanel.tsx";
import { MacrosPanel } from "./editProfile/MacrosPanel.tsx";
import { EditMacroDialog } from "./editProfile/EditMacroDialog.tsx";
import { ImportKeyDialog } from "./editProfile/ImportKeyDialog.tsx";
import { EditTaggedLayerDialog } from "./EditTaggedLayerDialog.tsx";

export function EditDeviceProfile({ className }: { className?: string }) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [showVirtualPanel, setShowVirtualPanel] = useState(true);

  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setShowVirtualPanel(el.getBoundingClientRect().height >= 650);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className={clsx("flex gap-0.5 overflow-x-auto bg-stone-950", className)}
      >
        <div className="grid min-w-56 grid-rows-2 flex-col gap-0.5">
          <TagsPanel />
          <KeysPanel showPhysicalKeys showVirtualKeys />
        </div>
        <div
          ref={columnRef}
          className="hidden grow basis-[56rem] flex-col xl:flex"
        >
          <KeyViewPanel className="m-4 grow" />
          {showVirtualPanel && <VirtualKeyPanel className="mx-10 mb-4" />}
        </div>
        <div className="grid shrink grow basis-80 grid-rows-2 gap-0.5">
          <LayersPanel />
          <BindingsPanel />
        </div>
        <MacrosPanel className="shrink grow basis-80" />
      </div>
      <EditTaggedLayerDialog />
      <EditMacroDialog />
      <ImportKeyDialog />
    </>
  );
}
