import {
  DeviceDetails,
  DeviceKey,
  DeviceKeyLayer,
  DeviceLayers,
  DeviceMacro,
  DeviceProfile,
  isLayerActionEvent,
  isLayerClearEvent,
  isLayerSetEvent,
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

export interface HistoryEntry {
  profile: DeviceProfile;
  description: string;
}

export interface EditDeviceState {
  device: DeviceDetails;
  profile: DeviceProfile;
  originalProfile: DeviceProfile;
  undoStack: readonly HistoryEntry[];
  redoStack: readonly HistoryEntry[];
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
    | CleanChangesAction
    | UndoAction
    | RedoAction
    | UndoToAction
    | RedoToAction
  );

export interface SetProfileAction {
  type: "setProfile";
  profile: DeviceProfile;
  description: string;
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

export interface CleanChangesAction {
  type: "cleanChanges";
}

export interface UndoAction {
  type: "undo";
}

export interface RedoAction {
  type: "redo";
}

export interface UndoToAction {
  type: "undoTo";
  index: number;
}

export interface RedoToAction {
  type: "redoTo";
  index: number;
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

type AddTaggedLayerModalOptions = {
  type: "addTaggedLayer";
  keyId: string;
  aboveLayerId: string | null;
} & ModalBaseOptions;

type EditMacroModalOptions = {
  type: "editMacro";
  macro: DeviceMacro;
} & ModalBaseOptions;

type ImportKeyModalOptions = {
  type: "importKey";
  keyExport: import("./keyImportExport.ts").KeyExport;
  conflicts: import("./keyImportExport.ts").MacroConflict[];
} & ModalBaseOptions;

type ModalOptions =
  | null
  | EditTaggedLayerModalOptions
  | AddTaggedLayerModalOptions
  | EditMacroModalOptions
  | ImportKeyModalOptions;

const UNDO_STACK_LIMIT = 50;

const editDeviceReducer = (
  state: EditDeviceState,
  action: EditDeviceAction,
): EditDeviceState => {
  switch (action.type) {
    case "setProfile": {
      const entry: HistoryEntry = {
        profile: state.profile,
        description: action.description,
      };
      const undoStack = [...state.undoStack, entry].slice(-UNDO_STACK_LIMIT);
      return {
        ...state,
        profile: action.profile,
        undoStack,
        redoStack: [],
      };
    }
    case "setSelectedKey": {
      const key = action.keyId ? findKeyById(action.keyId, state) : null;

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
        ? findKeyById(state.selectedKey, state)
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
    case "undo": {
      if (state.undoStack.length === 0) return state;
      const entry = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        profile: entry.profile,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [
          ...state.redoStack,
          { profile: state.profile, description: entry.description },
        ],
      };
    }
    case "redo": {
      if (state.redoStack.length === 0) return state;
      const entry = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        profile: entry.profile,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [
          ...state.undoStack,
          { profile: state.profile, description: entry.description },
        ],
      };
    }
    case "undoTo": {
      const index = action.index;
      if (index < 0 || index >= state.undoStack.length) return state;
      let currentProfile = state.profile;
      const newRedoEntries: HistoryEntry[] = [];
      for (let i = state.undoStack.length - 1; i >= index; i--) {
        const entry = state.undoStack[i];
        newRedoEntries.push({
          profile: currentProfile,
          description: entry.description,
        });
        currentProfile = entry.profile;
      }
      return {
        ...state,
        profile: currentProfile,
        undoStack: state.undoStack.slice(0, index),
        redoStack: [...state.redoStack, ...newRedoEntries],
      };
    }
    case "redoTo": {
      const index = action.index;
      if (index < 0 || index >= state.redoStack.length) return state;
      let currentProfile = state.profile;
      const newUndoEntries: HistoryEntry[] = [];
      for (let i = state.redoStack.length - 1; i >= index; i--) {
        const entry = state.redoStack[i];
        newUndoEntries.push({
          profile: currentProfile,
          description: entry.description,
        });
        currentProfile = entry.profile;
      }
      return {
        ...state,
        profile: currentProfile,
        redoStack: state.redoStack.slice(0, index),
        undoStack: [...state.undoStack, ...newUndoEntries],
      };
    }
    case "cleanChanges":
      return {
        ...state,
        originalProfile: state.profile,
      };
  }
};

export const EditDeviceContext = createContext<EditDevice | undefined>(
  undefined,
);

export function EditDeviceContextProvider({
  device,
  originalProfile,
  children,
}: {
  device: DeviceDetails;
  originalProfile: DeviceProfile;
  children: ReactNode;
}) {
  // initialize empty keys
  const initializedProfile: DeviceProfile = {
    ...originalProfile,
    keys: device.keyMap.map((kInfo) => {
      const existingKey = originalProfile.keys.find(
        (k) => k.id === kInfo.keyId,
      );
      return existingKey
        ? existingKey
        : {
            id: kInfo.keyId,
            layers: { layers: [], defaultLayer: { id: v4(), macros: [] } },
          };
    }),
    virtualKeys: Array.from({ length: device.virtualKeyCount }, (_, i) => {
      return originalProfile.virtualKeys[i] ?? {
        layers: { layers: [], defaultLayer: { id: v4(), macros: [] } },
      };
    }),
  };

  const initialState: EditDeviceState = {
    device,
    profile: initializedProfile,
    originalProfile: initializedProfile,
    undoStack: [],
    redoStack: [],
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

export const useMaybeEditDeviceContext = () => {
  return useContext(EditDeviceContext);
};

export const useEditDeviceContext = () => {
  const context = useMaybeEditDeviceContext();
  if (!context) {
    throw new Error(
      "useEditDevice must be used within a EditDeviceContextProvider",
    );
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

export const deleteMacro = (
  macroId: string,
  profile: DeviceProfile,
): DeviceProfile | "in use" => {
  const usages = getMacroUsages(macroId, profile);
  if (usages.length > 0) return "in use";
  return {
    ...profile,
    macros: profile.macros.filter((m) => m.id !== macroId),
  };
};

export const getVirtualKeyId = (index: number): string => `vk${index}`;

const parseVirtualKeyIndex = (keyId: string): number | null => {
  if (!keyId.startsWith("vk")) return null;
  const index = parseInt(keyId.slice(2), 10);
  return !isNaN(index) ? index : null;
};

export const findSelectedProfileLayer = (
  state: EditDeviceState,
): TaggedDeviceLayer | DeviceKeyLayer | null => {
  return state.selectedKey && state.selectedLayer
    ? findLayerById(state.selectedKey, state.selectedLayer, state)
    : null;
};

export const getSelectedKeyProfileLayers = (
  state: EditDeviceState,
): DeviceLayers | null => {
  return state.selectedKey
    ? (findKeyById(state.selectedKey, state)?.layers ?? null)
    : null;
};

export const findKeyById = (
  keyId: string,
  state: EditDeviceState,
): DeviceKey | VirtualKey | null => {
  const index = parseVirtualKeyIndex(keyId);
  if (index !== null) {
    return state.profile.virtualKeys[index] ?? null;
  }
  return state.profile.keys.find((k) => k.id === keyId) ?? null;
};

export const findLayerById = (
  keyId: string,
  layerId: string,
  state: EditDeviceState,
): DeviceKeyLayer | null => {
  const key = findKeyById(keyId, state);
  if (!key) return null;

  const taggedLayer = key.layers.layers.find((l) => l.layer.id === layerId);
  if (taggedLayer) return taggedLayer.layer;

  if (key.layers.defaultLayer.id === layerId) return key.layers.defaultLayer;

  return null;
};

export const findTaggedLayerById = (
  keyId: string,
  layerId: string,
  state: EditDeviceState,
): TaggedDeviceLayer | null => {
  const key = findKeyById(keyId, state);
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

export const getTagsInProfile = (profile: DeviceProfile): string[] => {
  const tagsFromLayers = profile.keys.flatMap((k) =>
    k.layers.layers.flatMap((l) => l.tags),
  );

  const tagsFromMacros = profile.macros.flatMap((m) =>
    [m.startSequence, m.loopSequence, m.endSequence].flatMap((s) =>
      s.actions
        .map((a) => {
          const actionEvent = a.actionEvent;
          if (!isLayerActionEvent(actionEvent)) return null!;
          if (isLayerSetEvent(actionEvent.layer)) return actionEvent.layer.set;
          if (isLayerClearEvent(actionEvent.layer))
            return actionEvent.layer.clear;
          return null!;
        })
        .filter((a) => a),
    ),
  );

  return [...new Set([...tagsFromLayers, ...tagsFromMacros])].sort();
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
