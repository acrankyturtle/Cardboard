import { useMemo } from "react";
import {
  DeviceKeyLayer,
  DeviceLayers,
  isTaggedDeviceLayer,
  TaggedDeviceLayer,
} from "../../api/devices.ts";
import { ListBox, ListBoxItem } from "../ListBox.tsx";
import {
  EditDeviceState,
  findKeyById,
  findSelectedProfileLayer,
  getSelectedKeyProfileLayers,
  getTaggedLayerName,
  insertLayer,
  newTaggedLayer,
  removeLayer,
  updateKeyLayers,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import { AddIcon, RemoveIcon } from "../../assets/sharedIcons.tsx";
import {
  PanelContainer,
  HeaderBar,
  headerBarIconClass,
  headerBarButtonClass,
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
  layer: TaggedDeviceLayer | DeviceKeyLayer;
}

const findSelectedLayerItem = (
  state: EditDeviceState,
): LayerListBoxItem | null => {
  const selectedLayer = findSelectedProfileLayer(state);
  return selectedLayer ? layerToItem(selectedLayer) : null;
};

const getSelectedKeyLayerItems = (
  state: EditDeviceState,
): readonly LayerListBoxItem[] => {
  const selectedKeyLayers = getSelectedKeyProfileLayers(state);
  return selectedKeyLayers
    ? [
        ...selectedKeyLayers.layers.map(layerToItem),
        layerToItem(selectedKeyLayers.defaultLayer),
      ]
    : [];
};

const layerToItem = (
  layer: TaggedDeviceLayer | DeviceKeyLayer,
): LayerListBoxItem => {
  if (isTaggedDeviceLayer(layer)) {
    return {
      label: getTaggedLayerName(layer),
      value: layer.layer.id,
      layer: layer,
    };
  }
  return {
    label: defaultLayerName,
    value: layer.id,
    layer: layer,
  };
};

const defaultLayerName = "(default)";

export function LayersPanel({ className }: { className?: string }) {
  const { state, dispatch } = useEditDeviceContext();

  const selectedLayer = findSelectedLayerItem(state);
  const layers = getSelectedKeyLayerItems(state);

  const isSelectedLayerDefaultLayer = useMemo(
    () =>
      selectedLayer && state.selectedKey
        ? findKeyById(state.selectedKey, state)?.layers.defaultLayer.id ===
          selectedLayer.value
        : undefined,
    [state],
  );

  const addLayer = () => {
    if (!state.selectedKey) return;
    const newLayer = newTaggedLayer();
    const updated = insertLayer(
      state.selectedKey,
      state.profile,
      state.selectedLayer,
      newLayer,
    );
    dispatch({
      type: "setProfile",
      profile: updated,
      description: "Add layer",
    });
    dispatch({
      type: "setSelectedLayer",
      layerId: newLayer.layer.id,
    });
  };

  const deleteLayer = () => {
    if (
      !state.selectedKey ||
      !state.selectedLayer ||
      !selectedLayer ||
      isSelectedLayerDefaultLayer === undefined
    )
      return;

    if (isSelectedLayerDefaultLayer) return;

    const newSelectedIndex = Math.min(
      Math.max(layers.findIndex((l) => l.value === state.selectedLayer) + 1, 0),
      layers.length - 1,
    );
    const newSelected = layers[newSelectedIndex];
    const updated = removeLayer(
      state.selectedKey,
      state.profile,
      state.selectedLayer,
    );
    dispatch({
      type: "setProfile",
      profile: updated,
      description: "Delete layer",
    });
    dispatch({
      type: "setSelectedLayer",
      layerId: newSelected.value,
    });
  };

  const moveUp = () => {
    const selectedLayer = state.selectedLayer;
    if (!state.selectedKey || !selectedLayer) return;
    const updatedProfile = updateKeyLayers(
      state.selectedKey,
      state.profile,
      (layers) => shiftLayer(selectedLayer, layers, -1),
    );
    dispatch({
      type: "setProfile",
      profile: updatedProfile,
      description: "Move layer up",
    });
    dispatch({
      type: "setSelectedLayer",
      layerId: state.selectedLayer,
    });
  };

  const moveDown = () => {
    const selectedLayer = state.selectedLayer;
    if (!state.selectedKey || !selectedLayer) return;
    const updatedProfile = updateKeyLayers(
      state.selectedKey,
      state.profile,
      (layers) => shiftLayer(selectedLayer, layers, 1),
    );
    dispatch({
      type: "setProfile",
      profile: updatedProfile,
      description: "Move layer down",
    });
    dispatch({
      type: "setSelectedLayer",
      layerId: state.selectedLayer,
    });
  };

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <LayersIcon />
        </div>
        <div>Layers</div>
        <HelpLink className="shrink-0" section="layers" />
        <div className="grow" />
        <Tooltip content="Add layer">
          <button className={headerBarButtonClass} onClick={addLayer}>
            <AddIcon />
          </button>
        </Tooltip>
        <Tooltip content="Delete layer">
          <button
            className={headerBarButtonClass}
            onClick={deleteLayer}
            disabled={isSelectedLayerDefaultLayer}
          >
            <RemoveIcon />
          </button>
        </Tooltip>
        <Tooltip content="Move up">
          <button className={headerBarButtonClass} onClick={moveUp}>
            <MoveUpIcon />
          </button>
        </Tooltip>
        <Tooltip content="Move down">
          <button className={headerBarButtonClass} onClick={moveDown}>
            <MoveDownIcon />
          </button>
        </Tooltip>
      </HeaderBar>
      <ContextMenu>
        <ContextMenuTrigger>
          <ListBox
            className="grow"
            variant="red"
            items={layers}
            selected={selectedLayer}
            setSelected={(v) =>
              dispatch({ type: "setSelectedLayer", layerId: v.value })
            }
            onDoubleClick={(item) => {
              if ("layer" in item.layer && state.selectedKey) {
                dispatch({
                  type: "setModal",
                  modal: {
                    type: "editTaggedLayer",
                    show: true,
                    keyId: state.selectedKey,
                    layerId: item.layer.layer.id,
                  },
                });
              } else {
                // todo: edit default layer
              }
            }}
          />
        </ContextMenuTrigger>
        <ContextMenuPopup>
          <ContextMenuItem onClick={addLayer}>
            <ContextMenuIcon>
              <AddIcon />
            </ContextMenuIcon>
            Add Layer
          </ContextMenuItem>
          <ContextMenuItem
            disabled={
              isSelectedLayerDefaultLayer === true ||
              isSelectedLayerDefaultLayer === undefined
            }
            onClick={deleteLayer}
          >
            <ContextMenuIcon>
              <RemoveIcon />
            </ContextMenuIcon>
            Delete Layer
          </ContextMenuItem>
          <ContextMenuItem onClick={moveUp}>
            <ContextMenuIcon>
              <MoveUpIcon />
            </ContextMenuIcon>
            Move Up
          </ContextMenuItem>
          <ContextMenuItem onClick={moveDown}>
            <ContextMenuIcon>
              <MoveDownIcon />
            </ContextMenuIcon>
            Move Down
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
    </PanelContainer>
  );
}

export const shiftLayer = (
  target: string,
  layers: DeviceLayers,
  offset: number,
): DeviceLayers => {
  const index = layers.layers.findIndex((l) => l.layer.id === target);
  if (index === -1) return layers;

  const newOffset = index + offset;
  if (newOffset < 0 || newOffset >= layers.layers.length) return layers;

  const updated = layers.layers.slice();
  [updated[index + offset], updated[index]] = [
    updated[index],
    updated[index + offset],
  ];
  return { ...layers, layers: updated };
};

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

function MoveUpIcon() {
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
      <path d="M12 5l0 14" />
      <path d="M18 11l-6 -6" />
      <path d="M6 11l6 -6" />
    </svg>
  );
}

function MoveDownIcon() {
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
      <path d="M12 5l0 14" />
      <path d="M18 13l-6 6" />
      <path d="M6 13l6 6" />
    </svg>
  );
}
