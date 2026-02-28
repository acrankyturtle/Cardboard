import clsx from "clsx";
import { useRef, useState, useEffect } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { snapCenterToCursor, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { TagsPanel } from "./editProfile/TagsPanel.tsx";
import { KeysPanel } from "./editProfile/KeysPanel.tsx";
import { KeyViewPanel } from "./editProfile/KeyViewPanel.tsx";
import { VirtualKeyPanel } from "./editProfile/VirtualKeyPanel.tsx";
import { LayersPanel } from "./editProfile/LayersPanel.tsx";
import { BindingsPanel } from "./editProfile/BindingsPanel.tsx";
import { MacrosPanel } from "./editProfile/MacrosPanel.tsx";
import { EditMacroDialog } from "./editProfile/EditMacroDialog.tsx";
import { ImportKeyDialog } from "./editProfile/ImportKeyDialog.tsx";
import { EditTaggedLayerDialog } from "./EditTaggedLayerDialog.tsx";
import { useMacroDragDrop } from "../hooks/useMacroDragDrop.ts";

export function EditDeviceProfile({ className }: { className?: string }) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [showVirtualPanel, setShowVirtualPanel] = useState(true);

  const {
    sensors,
    collisionDetection,
    modifiers,
    onDragStart,
    onDragEnd,
    activeDrag,
    dropAnimation,
  } = useMacroDragDrop();

  // show the virtual key panel if the column is tall enough to accommodate it, otherwise hide it to save space
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
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        modifiers={modifiers}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div
          className={clsx(
            "flex gap-[3px] overflow-x-auto bg-stone-950",
            className,
          )}
        >
          <div className="grid min-w-56 grid-rows-2 flex-col gap-[3px]">
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
          <div className="grid shrink grow basis-80 grid-rows-2 gap-[3px]">
            <LayersPanel />
            <BindingsPanel />
          </div>
          <MacrosPanel className="shrink grow basis-80" />
        </div>
        <DragOverlay
          dropAnimation={dropAnimation}
          modifiers={[snapCenterToCursor, restrictToWindowEdges]}
        >
          {activeDrag && (
            <div className="w-fit cursor-none rounded-full bg-blue-500 px-3 py-1 text-sm text-white shadow-lg select-none">
              {activeDrag.macroName}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <EditTaggedLayerDialog />
      <EditMacroDialog />
      <ImportKeyDialog />
    </>
  );
}
