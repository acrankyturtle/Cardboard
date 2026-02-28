import clsx, { ClassValue } from "clsx";
import { CSSProperties, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DeviceMacro, KeyColor } from "../../api/devices.ts";
import {
  findKeyById,
  getActiveLayer,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import { DropTargetData } from "./dndTypes.ts";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
} from "../ContextMenu.tsx";
import { KeyImportExportMenuItems } from "./keyImportExportMenu.tsx";

export function Key({
  keyId,
  keyName,
  keyColor,
  keyClassName,
  keyStyle,
  compact,
}: {
  keyId: string;
  keyName: string;
  keyColor: KeyColor;
  keyClassName?: string;
  keyStyle?: CSSProperties;
  compact?: boolean;
}) {
  const { state, dispatch } = useEditDeviceContext();
  const isSelected = state.selectedKey === keyId;
  const key = useMemo(() => findKeyById(keyId, state), [keyId, state]);
  const layerCount = key?.layers.layers.length ?? 0;
  const activeLayer = getActiveLayer(
    key?.layers ?? {
      layers: [],
      defaultLayer: {
        id: "",
        macros: [],
      },
    },
    state.selectedTags,
  );
  const macros = useMemo(
    () =>
      activeLayer.macros
        .map((mid) => state.profile.macros.find((m) => m.id === mid)!)
        .filter((m) => m),
    [activeLayer, state.profile.macros],
  );
  const keyLabel = useMemo(() => getActionLabelForMacros(macros), [macros]);

  const dropData: DropTargetData = { type: "key", keyId };
  const { setNodeRef, isOver } = useDroppable({
    id: `key-${keyId}`,
    data: dropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(keyClassName, { "p-0.5": !compact, "p-1": compact })}
      style={keyStyle}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <button
            className={clsx(
              "group relative size-full cursor-pointer select-none",
              {
                "p-[3px]": !compact,
              },
            )}
            onClick={() => dispatch({ type: "setSelectedKey", keyId: keyId })}
            onContextMenu={() =>
              dispatch({ type: "setSelectedKey", keyId: keyId })
            }
            type="button"
          >
            <div
              className={clsx(
                "inline-flex size-full items-center justify-center rounded-lg ring-3 ring-blue-400/0 transition-all duration-150 ring-inset",
                keyColorToClassName(keyColor, isSelected),
                {
                  "outline-lime-500": isSelected,
                  "outline-3 outline-offset-3": isSelected && !compact,
                  "outline-2 outline-offset-3": isSelected && compact,
                  "ring-blue-400/100": isOver,
                },
              )}
            >
              <div
                className={clsx("line-clamp-3 overflow-hidden text-ellipsis", {
                  "text-sm": compact,
                })}
              >
                {keyLabel}
              </div>
              <div
                className={clsx("absolute transition-colors duration-150", {
                  "text-stone-50": isSelected,
                  "text-stone-50/50 group-hover:text-stone-50": !isSelected,
                  "top-1.5 left-1.5 text-xs": !compact,
                  "top-0 left-1 text-xs": compact,
                })}
              >
                {keyName}
              </div>
              <div className="absolute top-1.5 right-2 text-xs">
                {layerCount > 0 && layerCount}
              </div>
            </div>
          </button>
        </ContextMenuTrigger>
        <ContextMenuPopup>
          <KeyImportExportMenuItems />
        </ContextMenuPopup>
      </ContextMenu>
    </div>
  );
}

export const getActionLabelForMacros = (
  macros: readonly DeviceMacro[],
): string => {
  switch (macros.length) {
    case 0:
      return "";
    case 1:
      return macros[0].name;
    default:
      return `[${macros.length} macros]`;
  }
};

export const keyColorToClassName = (
  color: KeyColor,
  isSelected: boolean,
): ClassValue => {
  switch (color) {
    case KeyColor.Regular:
      return {
        "bg-stone-700 hover:bg-stone-600 active:bg-stone-800": !isSelected,
        "bg-stone-800 text-lime-300": isSelected,
      };
    case KeyColor.Accent1:
      return {
        "bg-green-700 hover:bg-green-600 active:bg-green-800": !isSelected,
        "bg-green-900 text-lime-300": isSelected,
      };
    case KeyColor.Accent2:
      return {
        "bg-purple-700 hover:bg-purple-600 active:bg-purple-800": !isSelected,
        "bg-purple-900 text-lime-300": isSelected,
      };
    case KeyColor.Virtual:
      return {
        "bg-cyan-800 hover:bg-cyan-700 active:bg-cyan-900": !isSelected,
        "bg-cyan-950 text-lime-300": isSelected,
      };
  }
};
