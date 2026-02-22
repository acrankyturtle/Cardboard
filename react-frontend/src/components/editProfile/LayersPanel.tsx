import clsx from "clsx";
import { useState } from "react";
import { useDroppable, useDndMonitor, useDndContext } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { DeviceKeyLayer, TaggedDeviceLayer } from "../../api/devices.ts";
import { EmptyListItem, ListBoxItem } from "../ListBox.tsx";
import { SortableList } from "./SortableList.tsx";
import { RedListItem } from "../ListItem.tsx";
import {
  findLayerById,
  getSelectedKeyProfileLayers,
  getTaggedLayerName,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import {
  deleteLayer as deleteLayerAction,
  reorderLayers as reorderLayersAction,
} from "../../lib/profileActions.ts";
import { DropTargetData, isMacroDragData } from "./dndTypes.ts";
import { AddIcon, RemoveIcon } from "../../assets/sharedIcons.tsx";
import {
  PanelContainer,
  HeaderBar,
  HeaderBarButton,
  headerBarIconClass,
} from "./panelShared.tsx";
import { Tooltip } from "../Tooltip.tsx";
import { HelpLink } from "../HelpLink.tsx";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuIcon,
} from "../ContextMenu.tsx";

interface LayerListBoxItem extends ListBoxItem {
  layer: TaggedDeviceLayer;
}

const layerToItem = (layer: TaggedDeviceLayer): LayerListBoxItem => ({
  label: getTaggedLayerName(layer),
  value: layer.layer.id,
  layer: layer,
});

const defaultLayerName = "(default)";

function MacroCount({ macros }: { macros: readonly unknown[] }) {
  if (macros.length === 1) return null;
  if (macros.length !== 0) return <div>{macros.length}</div>;
  return <div className="opacity-40">(no bindings)</div>;
}

export function LayersPanel({ className }: { className?: string }) {
  const { state, dispatch } = useEditDeviceContext();

  const selectedKeyLayers = getSelectedKeyProfileLayers(state);
  const taggedLayers: readonly LayerListBoxItem[] = selectedKeyLayers
    ? selectedKeyLayers.layers.map(layerToItem)
    : [];
  const defaultLayerItem = selectedKeyLayers
    ? {
        label: defaultLayerName,
        value: selectedKeyLayers.defaultLayer.id,
        layer: selectedKeyLayers.defaultLayer,
      }
    : null;
  const selectedLayerItem =
    state.selectedKey && state.selectedLayer && selectedKeyLayers
      ? (() => {
          const tagged = selectedKeyLayers.layers.find(
            (l) => l.layer.id === state.selectedLayer,
          );
          return tagged ? layerToItem(tagged) : null;
        })()
      : null;

  const isSelectedLayerDefaultLayer =
    selectedLayerItem === null &&
    defaultLayerItem !== null &&
    state.selectedLayer === defaultLayerItem.value;

  const addLayer = () => {
    if (!state.selectedKey) return;
    dispatch({
      type: "setModal",
      modal: {
        type: "addTaggedLayer",
        show: true,
        keyId: state.selectedKey,
        aboveLayerId: state.selectedLayer,
      },
    });
  };

  const deleteLayer = () => {
    if (
      !state.selectedKey ||
      !state.selectedLayer ||
      isSelectedLayerDefaultLayer
    )
      return;

    // select the next layer after deletion, clamped to the last item (the default layer)
    const allItems = [
      ...taggedLayers,
      ...(defaultLayerItem ? [defaultLayerItem] : []),
    ];
    const currentIndex = allItems.findIndex(
      (l) => l.value === state.selectedLayer,
    );
    const newSelectedIndex = Math.min(
      Math.max(currentIndex + 1, 0),
      allItems.length - 1,
    );
    const newSelected = allItems[newSelectedIndex];
    dispatch(
      deleteLayerAction(state.selectedKey, state.selectedLayer, state.profile),
    );
    dispatch({
      type: "setSelectedLayer",
      layerId: newSelected.value,
    });
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleReorder = (reordered: LayerListBoxItem[]) => {
    if (!state.selectedKey) return;
    dispatch(
      reorderLayersAction(
        state.selectedKey,
        reordered.map((item) => item.layer),
        state.profile,
      ),
    );
  };

  useDndMonitor({
    onDragStart(event) {
      if (event.active.data.current?.sortable) {
        setIsDragging(true);
      }
    },
    onDragEnd(event) {
      if (!event.active.data.current?.sortable) return;
      setIsDragging(false);
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = taggedLayers.findIndex((l) => l.value === active.id);
        const newIndex = taggedLayers.findIndex((l) => l.value === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          handleReorder(arrayMove([...taggedLayers], oldIndex, newIndex));
        }
      }
    },
    onDragCancel() {
      setIsDragging(false);
    },
  });

  return (
    <PanelContainer
      className={className}
      data-dragging={isDragging || undefined}
    >
      <HeaderBar>
        <div className={headerBarIconClass}>
          <LayersIcon />
        </div>
        <div>Layers</div>
        <HelpLink className="shrink-0" section="layers" />
        <div className="grow" />
        <Tooltip content="Add layer">
          <HeaderBarButton onClick={addLayer}>
            <AddIcon />
          </HeaderBarButton>
        </Tooltip>
        <Tooltip content="Delete layer">
          <HeaderBarButton
            onClick={deleteLayer}
            disabled={isSelectedLayerDefaultLayer || !state.selectedLayer}
          >
            <RemoveIcon />
          </HeaderBarButton>
        </Tooltip>
      </HeaderBar>
      <ContextMenu>
        <ContextMenuTrigger>
          <SortableList
            items={taggedLayers}
            selected={selectedLayerItem}
            setSelected={(v) =>
              dispatch({ type: "setSelectedLayer", layerId: v.value })
            }
            sortableData={(item) => ({
              type: "layer",
              keyId: state.selectedKey ?? "",
              layerId: item.value,
            })}
            renderItem={(item, selected, isOver) => (
              <LayerItem
                layerId={item.value}
                keyId={state.selectedKey}
                label={item.label}
                selected={selected}
                isOver={isOver}
              />
            )}
            onDoubleClick={(item) => {
              if (state.selectedKey) {
                dispatch({
                  type: "setModal",
                  modal: {
                    type: "editTaggedLayer",
                    show: true,
                    keyId: state.selectedKey,
                    layerId: item.layer.layer.id,
                  },
                });
              }
            }}
          />
          {defaultLayerItem && (
            <DefaultLayerItem
              layer={defaultLayerItem.layer}
              keyId={state.selectedKey}
              selected={isSelectedLayerDefaultLayer}
              onClick={() =>
                dispatch({
                  type: "setSelectedLayer",
                  layerId: defaultLayerItem.value,
                })
              }
            />
          )}
          <div className="grow" />
        </ContextMenuTrigger>
        <ContextMenuPopup>
          <ContextMenuItem onClick={addLayer}>
            <ContextMenuIcon>
              <AddIcon />
            </ContextMenuIcon>
            Add Layer
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isSelectedLayerDefaultLayer || !state.selectedLayer}
            onClick={deleteLayer}
          >
            <ContextMenuIcon>
              <RemoveIcon />
            </ContextMenuIcon>
            Delete Layer
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
    </PanelContainer>
  );
}

function LayerItem({
  layerId,
  keyId,
  label,
  selected,
  isOver,
}: {
  layerId: string;
  keyId: string | null;
  label: string;
  selected?: boolean;
  isOver?: boolean;
}) {
  const { state } = useEditDeviceContext();
  const { active } = useDndContext();
  const layer = (() => {
    if (!keyId) return null;
    return findLayerById(keyId, layerId, state);
  })();

  const isMacroOver = isOver && isMacroDragData(active?.data.current);

  return (
    <RedListItem
      selected={selected}
      className={clsx(
        "flex size-full items-center outline-3 -outline-offset-3 outline-blue-400/0 transition-all duration-150",
        { "outline-blue-400/100": isMacroOver },
      )}
    >
      <div className="grow">{label || <EmptyListItem />}</div>
      {layer && <MacroCount macros={layer.macros} />}
    </RedListItem>
  );
}

function DefaultLayerItem({
  layer,
  keyId,
  selected,
  onClick,
}: {
  layer: DeviceKeyLayer;
  keyId: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  const dropData: DropTargetData = {
    type: "layer",
    keyId: keyId ?? "",
    layerId: layer.id,
  };
  const { setNodeRef, isOver } = useDroppable({
    id: `layer-${layer.id}`,
    data: dropData,
    disabled: !keyId,
  });
  const { active } = useDndContext();
  const isMacroOver = isOver && isMacroDragData(active?.data.current);

  return (
    <div ref={setNodeRef} onClick={onClick} className="cursor-pointer">
      <RedListItem
        selected={selected}
        className={clsx(
          "flex size-full items-center outline-3 -outline-offset-3 outline-blue-400/0 transition-all duration-150",
          { "outline-blue-400/100": isMacroOver },
        )}
      >
        <div className="grow">{defaultLayerName}</div>
        <MacroCount macros={layer.macros} />
      </RedListItem>
    </div>
  );
}

function LayersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" />
      <path d="M17 17v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2" />
    </svg>
  );
}
