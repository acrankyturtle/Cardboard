import clsx from "clsx";
import { useRef, useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
  type Modifier,
} from "@dnd-kit/core";
import {
  snapCenterToCursor,
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { isTaggedDeviceLayer } from "../api/devices.ts";
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
import { isMacroDragData, DropTargetData } from "./editProfile/dndTypes.ts";
import {
  findKeyById,
  findSelectedProfileLayer,
  getActiveLayer,
  useEditDeviceContext,
} from "../lib/editDeviceContext.tsx";
import { addBinding } from "../lib/profileActions.ts";

export function EditDeviceProfile({ className }: { className?: string }) {
  const columnRef = useRef<HTMLDivElement>(null);
  const dropSuccessRef = useRef(false);
  const [showVirtualPanel, setShowVirtualPanel] = useState(true);
  const [activeDrag, setActiveDrag] = useState<{
    macroId: string;
    macroName: string;
  } | null>(null);

  const { state, dispatch } = useEditDeviceContext();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const customCollisionDetection: CollisionDetection = (args) => {
    if (args.active.data.current?.sortable) {
      return closestCenter(args);
    }
    return pointerWithin(args);
  };

  const sortModifier: Modifier = (args) => {
    if (args.active?.data.current?.sortable) {
      let transform = restrictToVerticalAxis(args);
      transform = restrictToParentElement({ ...args, transform });
      return transform;
    }
    return args.transform;
  };

  const modifiers = useMemo(() => [sortModifier], []);

  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setShowVirtualPanel(el.getBoundingClientRect().height >= 650);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (isMacroDragData(data)) {
      setActiveDrag({ macroId: data.macroId, macroName: data.macroName });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    dropSuccessRef.current = false;
    setActiveDrag(null);

    const dragData = event.active.data.current;
    const dropData = event.over?.data.current as DropTargetData | undefined;
    if (!dragData || !dropData || !isMacroDragData(dragData)) return;

    const macroId = dragData.macroId;

    if (dropData.type === "key") {
      const key = findKeyById(dropData.keyId, state);
      if (!key) return;
      const activeLayer = getActiveLayer(key.layers, state.selectedTags);
      if (activeLayer.macros.includes(macroId)) return;
      dispatch(
        addBinding(dropData.keyId, activeLayer.id, macroId, state.profile),
      );
      dispatch({ type: "setSelectedKey", keyId: dropData.keyId });
      dropSuccessRef.current = true;
    } else if (dropData.type === "layer") {
      const key = findKeyById(dropData.keyId, state);
      if (!key) return;
      const allLayers = [
        ...key.layers.layers.map((l) => l.layer),
        key.layers.defaultLayer,
      ];
      const layer = allLayers.find((l) => l.id === dropData.layerId);
      if (!layer) return;
      if (layer.macros.includes(macroId)) return;
      dispatch(
        addBinding(dropData.keyId, dropData.layerId, macroId, state.profile),
      );
      dispatch({ type: "setSelectedLayer", layerId: dropData.layerId });
      dropSuccessRef.current = true;
    } else if (dropData.type === "bindings") {
      if (!state.selectedKey || !state.selectedLayer) return;
      const selectedLayer = findSelectedProfileLayer(state);
      if (!selectedLayer) return;
      const macros = isTaggedDeviceLayer(selectedLayer)
        ? selectedLayer.layer.macros
        : selectedLayer.macros;
      if (macros.includes(macroId)) return;
      dispatch(
        addBinding(
          state.selectedKey,
          state.selectedLayer,
          macroId,
          state.profile,
        ),
      );
      dropSuccessRef.current = true;
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        modifiers={modifiers}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
          dropAnimation={dropSuccessRef.current ? null : undefined}
          modifiers={[snapCenterToCursor]}
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
