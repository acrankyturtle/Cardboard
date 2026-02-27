import { useRef, useState, useMemo } from "react";
import {
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  defaultDropAnimationSideEffects,
  type CollisionDetection,
  type DropAnimation,
  type Modifier,
} from "@dnd-kit/core";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { isMacroDragData, DropTargetData } from "../components/editProfile/dndTypes.ts";
import {
  EditDeviceState,
  findKeyById,
  findLayerById,
  getActiveLayer,
  useEditDeviceContext,
} from "../lib/editDeviceContext.tsx";
import { addBinding } from "../lib/profileActions.ts";

export function useMacroDragDrop() {
  const dropSuccessRef = useRef(false);
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

  const collisionDetection: CollisionDetection = (args) => {
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

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (isMacroDragData(data)) {
      setActiveDrag({ macroId: data.macroId, macroName: data.macroName });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    dropSuccessRef.current = false;
    setActiveDrag(null);

    const dragData = event.active.data.current;
    const dropData = event.over?.data.current as DropTargetData | undefined;
    if (!dragData || !dropData || !isMacroDragData(dragData)) return;

    const resolved = resolveDropTarget(dropData, state);
    if (!resolved) return;

    const { keyId, layerId } = resolved;

    const result = addBinding(keyId, layerId, dragData.macroId, state.profile);
    if (result === "duplicate") return;

    dispatch(result);
    dropSuccessRef.current = true;

    if (dropData.type === "key") {
      dispatch({ type: "setSelectedKey", keyId });
    } else if (dropData.type === "layer") {
      dispatch({ type: "setSelectedLayer", layerId });
    }
  };

  const dropAnimation: DropAnimation | null = dropSuccessRef.current
    ? null
    : cancelDropAnimation;

  return {
    sensors,
    collisionDetection,
    modifiers,
    onDragStart,
    onDragEnd,
    activeDrag,
    dropAnimation,
  };
}

const cancelDropAnimation: DropAnimation = {
  duration: 200,
  easing: "ease",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "1" } },
  }),
};

function resolveDropTarget(
  dropData: DropTargetData,
  state: EditDeviceState,
): { keyId: string; layerId: string; macros: readonly string[] } | null {
  if (dropData.type === "key") {
    const key = findKeyById(dropData.keyId, state);
    if (!key) return null;
    const activeLayer = getActiveLayer(key.layers, state.selectedTags);
    return {
      keyId: dropData.keyId,
      layerId: activeLayer.id,
      macros: activeLayer.macros,
    };
  } else if (dropData.type === "layer") {
    const layer = findLayerById(dropData.keyId, dropData.layerId, state);
    if (!layer) return null;
    return {
      keyId: dropData.keyId,
      layerId: dropData.layerId,
      macros: layer.macros,
    };
  } else if (dropData.type === "bindings") {
    if (!state.selectedKey || !state.selectedLayer) return null;
    const layer = findLayerById(state.selectedKey, state.selectedLayer, state);
    if (!layer) return null;
    return {
      keyId: state.selectedKey,
      layerId: state.selectedLayer,
      macros: layer.macros,
    };
  }
  return null;
}
