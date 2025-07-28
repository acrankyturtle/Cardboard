import {
  DeviceKey,
  DeviceMacro,
  DeviceProfile,
  TaggedDeviceLayer,
  useDeviceProfile,
} from "../api/devices.ts";
import { ListBoxItem } from "../components/ListBox.tsx";
import { createContext, ReactNode, useContext, useReducer } from "react";

export interface ProfileState {
  profile: DeviceProfile;
}

export interface ProfileContext {
  profile: ProfileState;
  dispatch: (action: ProfileAction) => void;
}

interface ProfileActionBase {
  type: string;
}

type ProfileAction = ProfileActionBase &
  (SetLayerProfileAction | SetMacroProfileAction);

export interface SetLayerProfileAction {
  type: "setLayer";
  keyId: string;
  layer: LayerModel;
}

export interface SetMacroProfileAction {
  type: "setMacro";
  macroId: string;
  macro: DeviceMacro;
}

export type LayerModel = LayerModelBase &
  (TaggedLayerModel | DefaultLayerModel);

export interface LayerModelBase {
  keyId: string;
  layerId: string | 0; // 0 = default layer
  macro: readonly ListBoxItem[];
  tags: readonly string[];
}

export interface DefaultLayerModel {
  layerId: 0;
  macro: readonly ListBoxItem[];
  tags: readonly [];
}
export interface TaggedLayerModel {
  layerId: string;
  macro: readonly ListBoxItem[];
  tags: readonly string[];
}

export const ProfileContext = createContext<ProfileContext | undefined>(
  undefined,
);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { profile } = useDeviceProfile();
  const [state, dispatch] = useReducer(profileReducer);
}

export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }
  return context;
};

export const profileReducer = (
  state: ProfileState,
  action: ProfileAction,
): ProfileState => {
  switch (action.type) {
    case "setLayer":
      const existingKey = state.profile.keys.find(
        (key) => key.id === action.keyId,
      );

      if (!existingKey) {
        console.error("Key does not exist"); // todo: handle better?
        return state;
      }

      let updatedKey: DeviceKey;

      if (action.layer.layerId === 0) {
        // default layer
        updatedKey = {
          ...existingKey,
          defaultLayer: {
            ...existingKey.defaultLayer,
            macros: action.layer.macro.map((m) => m.value),
          },
        };
      } else {
        // tagged layer
        const existingLayer = existingKey.layers?.find(
          (l) => l.layer.id === action.layer.layerId,
        );
        if (!existingLayer) {
          console.error("Layer does not exist"); // todo: handle better?
          return state;
        }

        let updatedLayer: TaggedDeviceLayer = {
          ...existingLayer,
          layer: {
            ...existingLayer.layer,
            macros: action.layer.macro.map((m) => m.value),
          },
          tags: action.layer.tags,
          // TODO: match type
        };

        updatedKey = {
          ...existingKey,
          layers:
            existingKey.layers?.map((l): TaggedDeviceLayer => {
              return l.layer.id === action.layer.layerId ? updatedLayer : l;
            }) ?? [],
        };
      }

      return {
        ...state,
        profile: {
          ...state.profile,
          keys: [
            ...state.profile.keys.map((k) =>
              k.id === action.keyId ? updatedKey : k,
            ),
          ],
        },
      };
    case "setMacro":
      return state; // TODO
    default:
      return state;
  }
};
