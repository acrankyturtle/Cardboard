import {
  DeviceMacro,
  DeviceProfile,
  TaggedDeviceLayer,
} from "../api/devices.ts";
import { SetProfileAction } from "./editDeviceContext.tsx";
import {
  deleteMacro as deleteMacroUtil,
  findMacroById,
  insertLayer,
  removeLayer,
  updateKeyLayers,
  updateLayerBindings,
  updateTaggedLayer,
} from "./editDeviceContext.tsx";
import { applyKeyImport, KeyExport, MacroConflict } from "./keyImportExport.ts";

export function addBinding(
  keyId: string,
  layerId: string,
  macroId: string,
  profile: DeviceProfile,
): SetProfileAction | "duplicate" {
  if (getLayerMacros(keyId, layerId, profile).includes(macroId)) {
    return "duplicate";
  }
  return {
    type: "setProfile",
    profile: updateLayerBindings(keyId, layerId, profile, [
      ...getLayerMacros(keyId, layerId, profile),
      macroId,
    ]),
    description: `Bind '${getMacroName(macroId, profile)}'`,
  };
}

export function removeBindings(
  keyId: string,
  layerId: string,
  macroIdsToRemove: readonly string[],
  profile: DeviceProfile,
): SetProfileAction {
  const currentBindings = getLayerMacros(keyId, layerId, profile);
  const names = macroIdsToRemove.map((id) => getMacroName(id, profile));
  return {
    type: "setProfile",
    profile: updateLayerBindings(
      keyId,
      layerId,
      profile,
      currentBindings.filter((id) => !macroIdsToRemove.includes(id)),
    ),
    description: `Unbind ${names.map((n) => `'${n}'`).join(", ")}`,
  };
}

export function addLayerWithTags(
  keyId: string,
  aboveLayerId: string | null,
  layer: TaggedDeviceLayer,
  profile: DeviceProfile,
): { action: SetProfileAction; newLayerId: string } {
  return {
    action: {
      type: "setProfile",
      profile: insertLayer(keyId, profile, aboveLayerId, layer),
      description: `Add layer '${layer.tags.join(", ")}'`,
    },
    newLayerId: layer.layer.id,
  };
}

export function deleteLayer(
  keyId: string,
  layerId: string,
  profile: DeviceProfile,
): SetProfileAction {
  return {
    type: "setProfile",
    profile: removeLayer(keyId, profile, layerId),
    description: `Delete layer${describeLayerTags(keyId, layerId, profile)}`,
  };
}

export function reorderLayers(
  keyId: string,
  reorderedLayers: TaggedDeviceLayer[],
  profile: DeviceProfile,
): SetProfileAction {
  return {
    type: "setProfile",
    profile: updateKeyLayers(keyId, profile, (layers) => ({
      ...layers,
      layers: reorderedLayers,
    })),
    description: "Reorder layers",
  };
}

export function editTaggedLayer(
  keyId: string,
  layerId: string,
  updatedLayer: TaggedDeviceLayer,
  profile: DeviceProfile,
): SetProfileAction {
  return {
    type: "setProfile",
    profile: updateTaggedLayer(keyId, layerId, profile, updatedLayer),
    description: `Edit layer '${updatedLayer.tags.join(", ")}'`,
  };
}

export function saveMacro(
  macro: DeviceMacro,
  isNew: boolean,
  profile: DeviceProfile,
): SetProfileAction {
  const exists = findMacroById(macro.id, profile) !== null;
  return {
    type: "setProfile",
    profile: {
      ...profile,
      macros: exists
        ? profile.macros.map((m) => (m.id === macro.id ? macro : m))
        : [...profile.macros, macro],
    },
    description: `${isNew ? "Create" : "Edit"} macro '${macro.name}'`,
  };
}

export function deleteProfileMacro(
  macroId: string,
  profile: DeviceProfile,
): SetProfileAction | "in use" {
  const result = deleteMacroUtil(macroId, profile);
  if (result === "in use") return "in use";
  const macroName =
    profile.macros.find((m) => m.id === macroId)?.name ?? "macro";
  return {
    type: "setProfile",
    profile: result,
    description: `Delete macro '${macroName}'`,
  };
}

export function importKey(
  keyId: string,
  keyExport: KeyExport,
  conflicts: MacroConflict[],
  profile: DeviceProfile,
): SetProfileAction {
  return {
    type: "setProfile",
    profile: applyKeyImport(keyId, keyExport, conflicts, profile),
    description: "Import key",
  };
}

export function importProfile(newProfile: DeviceProfile): SetProfileAction {
  return {
    type: "setProfile",
    profile: newProfile,
    description: "Import profile",
  };
}

export function renameProfile(
  newName: string,
  profile: DeviceProfile,
): SetProfileAction {
  return {
    type: "setProfile",
    profile: { ...profile, name: newName },
    description: `Rename profile to '${newName}'`,
  };
}

function getMacroName(macroId: string, profile: DeviceProfile): string {
  return profile.macros.find((m) => m.id === macroId)?.name ?? "macro";
}

function describeLayerTags(
  keyId: string,
  layerId: string,
  profile: DeviceProfile,
): string {
  const key = profile.keys.find((k) => k.id === keyId);
  const vkMatch = keyId.match(/^vk(\d+)$/);
  const virtualKey = vkMatch
    ? profile.virtualKeys[parseInt(vkMatch[1], 10)]
    : null;
  const target = key ?? virtualKey;
  if (!target) return "";

  const tagged = target.layers.layers.find((l) => l.layer.id === layerId);
  if (!tagged || tagged.tags.length === 0) return "";
  return ` '${tagged.tags.join(", ")}'`;
}

function getLayerMacros(
  keyId: string,
  layerId: string,
  profile: DeviceProfile,
): readonly string[] {
  // Find the layer's current macros by searching through the key's layers
  const key = profile.keys.find((k) => k.id === keyId);
  const vkMatch = keyId.match(/^vk(\d+)$/);
  const virtualKey = vkMatch
    ? profile.virtualKeys[parseInt(vkMatch[1], 10)]
    : null;
  const target = key ?? virtualKey;
  if (!target) return [];

  if (target.layers.defaultLayer.id === layerId) {
    return target.layers.defaultLayer.macros;
  }
  const tagged = target.layers.layers.find((l) => l.layer.id === layerId);
  return tagged?.layer.macros ?? [];
}
