import {
  DeviceDetails,
  DeviceKey,
  DeviceKeyLayer,
  DeviceLayers,
  DeviceMacro,
  DeviceProfile,
  TaggedDeviceLayer,
  TagMatchType,
  VirtualKey,
} from "../api/devices.ts";
import { createContext, ReactNode, useContext, useReducer } from "react";
import { v4 } from "uuid";

export interface EditDevice {
  state: EditDeviceState;
  dispatch: (action: EditDeviceAction) => void;
}

export interface EditDeviceState {
  device: DeviceDetails;
  profile: DeviceProfile;
  originalProfile: DeviceProfile;
  selectedKey: string | null;
  selectedLayer: string | null;
  selectedMacro: string | null;
  selectedBinding: readonly number[];
  selectedTags: readonly string[];
  modal: ModalOptions;
}

interface EditDeviceActionBase {
  type: string;
}

export type EditDeviceAction = EditDeviceActionBase &
  (
    | SetProfileAction
    | SetSelectedKeyAction
    | SetSelectedLayerAction
    | SetSelectedMacroAction
    | SetSelectedBindingsAction
    | SetSelectedTagsAction
    | SetModalAction
  );

export interface SetProfileAction {
  type: "setProfile";
  profile: DeviceProfile;
}

export interface SetSelectedKeyAction {
  type: "setSelectedKey";
  keyId: string | null;
}

export interface SetSelectedLayerAction {
  type: "setSelectedLayer";
  layerId: string | null;
}

export interface SetSelectedMacroAction {
  type: "setSelectedMacro";
  macroId: string | null;
}

export interface SetSelectedBindingsAction {
  type: "setSelectedBindings";
  index: readonly number[];
}

export interface SetSelectedTagsAction {
  type: "setSelectedTags";
  tags: readonly string[];
}

export interface SetModalAction {
  type: "setModal";
  modal: ModalOptions;
}

interface ModalBaseOptions {
  type: string;
  show?: boolean;
}

type EditTaggedLayerModalOptions = {
  type: "editTaggedLayer";
  keyId: string;
  layerId: string;
} & ModalBaseOptions;

type EditMacroModalOptions = {
  type: "editMacro";
  macroId: string;
} & ModalBaseOptions;

type ModalOptions = null | EditTaggedLayerModalOptions | EditMacroModalOptions;

const editDeviceReducer = (
  state: EditDeviceState,
  action: EditDeviceAction,
): EditDeviceState => {
  switch (action.type) {
    case "setProfile":
      return {
        ...state,
        profile: action.profile,
      };
    case "setSelectedKey": {
      const key = action.keyId
        ? findKeyById(action.keyId, state.profile)
        : null;

      const selectedLayer = key
        ? getActiveLayer(key.layers, state.selectedTags).id
        : null;

      return {
        ...state,
        selectedKey: action.keyId,
        selectedLayer,
        selectedBinding: [],
      };
    }
    case "setSelectedLayer":
      return {
        ...state,
        selectedLayer: action.layerId,
        selectedBinding: [],
      };
    case "setSelectedMacro":
      return {
        ...state,
        selectedMacro: action.macroId,
      };
    case "setSelectedBindings":
      return {
        ...state,
        selectedBinding: action.index,
      };
    case "setSelectedTags": {
      const selectedKey = state.selectedKey
        ? findKeyById(state.selectedKey, state.profile)
        : null;

      const selectedLayer = selectedKey
        ? getActiveLayer(selectedKey.layers, action.tags).id
        : null;
      return {
        ...state,
        selectedTags: action.tags,
        selectedLayer: selectedLayer,
      };
    }
    case "setModal":
      return {
        ...state,
        modal: action.modal,
      };
  }
};

export const EditDeviceContext = createContext<EditDevice | undefined>(
  undefined,
);

export function EditDeviceContextProvider({
  device,
  profile,
  children,
}: {
  device: DeviceDetails;
  profile: DeviceProfile;
  children: ReactNode;
}) {
  const initialState: EditDeviceState = {
    device,
    profile,
    originalProfile: profile,
    selectedKey: null,
    selectedLayer: null,
    selectedMacro: null,
    selectedBinding: [],
    selectedTags: [],
    modal: null,
  };
  const [state, dispatch] = useReducer(editDeviceReducer, initialState);

  return (
    <EditDeviceContext.Provider value={{ state, dispatch }}>
      {children}
    </EditDeviceContext.Provider>
  );
}

export const useEditDeviceContext = () => {
  const context = useContext(EditDeviceContext);
  if (!context) {
    throw new Error("useEditDevice must be used within a ProfileProvider");
  }
  return context;
};

export const updateKeyLayers = (
  keyId: string,
  profile: DeviceProfile,
  action: (layers: DeviceLayers) => DeviceLayers,
): DeviceProfile => {
  const virtualKeyId = parseVirtualKeyIndex(keyId);

  if (virtualKeyId !== null) {
    const virtualKey = profile.virtualKeys[virtualKeyId];
    if (!virtualKey) return profile;
    return {
      ...profile,
      virtualKeys: profile.virtualKeys.map((key, index) =>
        index === virtualKeyId ? { ...key, layers: action(key.layers) } : key,
      ),
    };
  }

  return {
    ...profile,
    keys: profile.keys.map((key) =>
      key.id === keyId ? { ...key, layers: action(key.layers) } : key,
    ),
  };
};

export const updateLayerBindings = (
  keyId: string,
  layerId: string,
  profile: DeviceProfile,
  value: readonly string[],
): DeviceProfile =>
  updateKeyLayers(keyId, profile, (layers) =>
    layers.defaultLayer.id === layerId
      ? { ...layers, defaultLayer: { ...layers.defaultLayer, macros: value } }
      : {
          ...layers,
          layers: layers.layers.map((l) =>
            l.layer.id === layerId
              ? { ...l, layer: { ...l.layer, macros: value } }
              : l,
          ),
        },
  );

export const updateTaggedLayer = (
  keyId: string,
  layerId: string,
  profile: DeviceProfile,
  value: TaggedDeviceLayer,
): DeviceProfile =>
  updateKeyLayers(keyId, profile, (layers) => ({
    ...layers,
    layers: layers.layers.map((l) => (l.layer.id === layerId ? value : l)),
  }));

export const insertLayer = (
  keyId: string,
  profile: DeviceProfile,
  above: string | null,
  value: TaggedDeviceLayer,
): DeviceProfile =>
  updateKeyLayers(keyId, profile, (layers) => {
    const maybeIndex = above
      ? layers.layers.findIndex((l) => l.layer.id === above)
      : -1;
    const index = maybeIndex >= 0 ? maybeIndex : layers.layers.length;

    return {
      ...layers,
      layers: [
        ...layers.layers.slice(0, index),
        value,
        ...layers.layers.slice(index),
      ],
    };
  });

export const removeLayer = (
  keyId: string,
  profile: DeviceProfile,
  layerId: string,
): DeviceProfile => {
  const virtualKeyId = parseVirtualKeyIndex(keyId);
  if (virtualKeyId !== null) {
    const virtualKey = profile.virtualKeys[virtualKeyId];
    if (!virtualKey) return profile;
    return {
      ...profile,
      virtualKeys: profile.virtualKeys.map((key, idx) => {
        if (idx !== virtualKeyId) return key;
        return removeTaggedLayerInKey(key, layerId);
      }),
    };
  }

  return {
    ...profile,
    keys: profile.keys.map((key) => {
      if (key.id !== keyId) return key;
      return removeTaggedLayerInKey(key, layerId);
    }),
  };
};

const removeTaggedLayerInKey = <TKey extends DeviceKey | VirtualKey>(
  key: TKey,
  layerId: string,
): TKey => {
  return {
    ...key,
    layers: {
      ...key.layers,
      layers: key.layers.layers.filter((l) => l.layer.id !== layerId),
    },
  };
};

export const newTaggedLayer = (): TaggedDeviceLayer => ({
  layer: { id: v4(), macros: [] },
  tags: [],
  matchType: TagMatchType.Any,
});

export const getVirtualKeyId = (index: number): string => `vk${index}`;

const parseVirtualKeyIndex = (keyId: string): number | null => {
  if (!keyId.startsWith("vk")) return null;
  const index = parseInt(keyId.slice(2), 10);
  return !isNaN(index) ? index : null;
};

export const findSelectedProfileKey = (
  state: EditDeviceState,
): DeviceKey | VirtualKey | null => {
  return state.selectedKey
    ? findKeyById(state.selectedKey, state.profile)
    : null;
};

export const findSelectedProfileLayer = (
  state: EditDeviceState,
): TaggedDeviceLayer | DeviceKeyLayer | null => {
  return state.selectedKey && state.selectedLayer
    ? findLayerById(state.selectedKey, state.selectedLayer, state.profile)
    : null;
};

export const getSelectedKeyProfileLayers = (
  state: EditDeviceState,
): DeviceLayers | null => {
  return state.selectedKey
    ? (findKeyById(state.selectedKey, state.profile)?.layers ?? null)
    : null;
};

export const findKeyById = (
  keyId: string,
  profile: DeviceProfile,
): DeviceKey | VirtualKey | null => {
  const index = parseVirtualKeyIndex(keyId);
  if (index !== null) {
    return profile.virtualKeys[index] ?? newVirtualKey();
  }
  return profile.keys.find((k) => k.id === keyId) ?? null;
};

const newVirtualKey = (): VirtualKey => ({
  layers: { layers: [], defaultLayer: { id: v4(), macros: [] } },
});

export const findLayerById = (
  keyId: string,
  layerId: string,
  profile: DeviceProfile,
): DeviceKeyLayer | null => {
  const key = findKeyById(keyId, profile);
  if (!key) return null;

  const taggedLayer = key.layers.layers.find((l) => l.layer.id === layerId);
  if (taggedLayer) return taggedLayer.layer;

  if (key.layers.defaultLayer.id === layerId) return key.layers.defaultLayer;

  return null;
};

export const findTaggedLayerById = (
  keyId: string,
  layerId: string,
  profile: DeviceProfile,
): TaggedDeviceLayer | null => {
  const key = findKeyById(keyId, profile);
  if (!key) return null;

  return key.layers.layers.find((l) => l.layer.id === layerId) ?? null;
};

export const getActiveLayer = (
  layers: DeviceLayers,
  tags: readonly string[],
): DeviceKeyLayer => {
  const matchingLayer = layers.layers.find((l) => layerMatchesTags(l, tags));
  if (matchingLayer) return matchingLayer.layer;
  return layers.defaultLayer;
};

const layerMatchesTags = (
  layer: TaggedDeviceLayer,
  tags: readonly string[],
) => {
  switch (layer.matchType) {
    case TagMatchType.Any:
      return layer.tags.some((t) => tags.includes(t));
    case TagMatchType.All:
      return layer.tags.every((t) => tags.includes(t));
  }
};

export const findMacroById = (
  macroId: string,
  profile: DeviceProfile,
): DeviceMacro | null => {
  return profile.macros.find((m) => m.id === macroId) ?? null;
};

export const getTaggedLayerName = (layer: TaggedDeviceLayer): string => {
  return layer.tags.join(", ");
};

export const getMacroUsages = (
  macroId: string,
  profile: DeviceProfile,
): { keyId: string; layer: DeviceKeyLayer }[] => {
  const physicalKeys = profile.keys.map((k) => ({
    keyId: k.id,
    layers: k.layers,
  }));
  const virtualKeys = profile.virtualKeys.map((vk) => ({
    keyId: getVirtualKeyId(profile.virtualKeys.indexOf(vk)),
    layers: vk.layers,
  }));

  const keys = [...physicalKeys, ...virtualKeys];
  const layers = keys.flatMap((k) =>
    [...k.layers.layers.map((l) => l.layer), k.layers.defaultLayer].map(
      (layer) => ({ ...k, layer }),
    ),
  );

  return layers.filter((l) => l.layer.macros.includes(macroId));
};
