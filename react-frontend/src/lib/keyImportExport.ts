import {
  DeviceKeyLayer,
  DeviceLayers,
  DeviceMacro,
  DeviceProfile,
  TagMatchType,
} from "../api/devices.ts";
import {
  EditDeviceState,
  findKeyById,
  updateKeyLayers,
} from "./editDeviceContext.tsx";
import { isValidMacro } from "../components/editProfile/MacrosPanel.tsx";
import { v4 } from "uuid";

export interface KeyExport {
  version: 1;
  layers: DeviceLayers;
  macros: readonly DeviceMacro[];
}

export type MacroResolution = "duplicate" | "useExisting" | "overwrite";

export interface MacroConflict {
  imported: DeviceMacro;
  existing: DeviceMacro;
  resolution: MacroResolution;
}

export function buildKeyExport(
  keyId: string,
  state: EditDeviceState,
): KeyExport | null {
  const key = findKeyById(keyId, state);
  if (!key) return null;

  const macroIds = new Set<string>();
  macroIds.forEach(() => {});

  // Collect macro IDs from default layer
  for (const id of key.layers.defaultLayer.macros) {
    macroIds.add(id);
  }
  // Collect macro IDs from tagged layers
  for (const taggedLayer of key.layers.layers) {
    for (const id of taggedLayer.layer.macros) {
      macroIds.add(id);
    }
  }

  const macros = state.profile.macros.filter((m) => macroIds.has(m.id));

  return {
    version: 1,
    layers: key.layers,
    macros,
  };
}

export function isValidKeyExport(data: unknown): data is KeyExport {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  if (d.version !== 1) return false;

  // Validate layers
  if (!d.layers || typeof d.layers !== "object") return false;
  const layers = d.layers as Record<string, unknown>;

  // Validate defaultLayer
  if (!layers.defaultLayer || typeof layers.defaultLayer !== "object")
    return false;
  const defaultLayer = layers.defaultLayer as Record<string, unknown>;
  if (typeof defaultLayer.id !== "string") return false;
  if (!Array.isArray(defaultLayer.macros)) return false;

  // Validate tagged layers array
  if (!Array.isArray(layers.layers)) return false;
  for (const taggedLayer of layers.layers) {
    if (!taggedLayer || typeof taggedLayer !== "object") return false;
    const tl = taggedLayer as Record<string, unknown>;
    if (!Array.isArray(tl.tags)) return false;
    if (
      tl.matchType !== TagMatchType.Any &&
      tl.matchType !== TagMatchType.All
    )
      return false;
    if (!tl.layer || typeof tl.layer !== "object") return false;
    const layer = tl.layer as Record<string, unknown>;
    if (typeof layer.id !== "string") return false;
    if (!Array.isArray(layer.macros)) return false;
  }

  // Validate macros array
  if (!Array.isArray(d.macros)) return false;
  for (const macro of d.macros) {
    if (!isValidMacro(macro)) return false;
    if (typeof (macro as unknown as Record<string, unknown>).id !== "string")
      return false;
  }

  return true;
}

export function detectConflicts(
  keyExport: KeyExport,
  profile: DeviceProfile,
): MacroConflict[] {
  const conflicts: MacroConflict[] = [];

  for (const imported of keyExport.macros) {
    const existing = profile.macros.find((m) => m.id === imported.id);
    if (!existing) continue; // New macro, no conflict

    // Same ID and same content — skip (will be deduplicated)
    if (JSON.stringify(existing) === JSON.stringify(imported)) continue;

    conflicts.push({
      imported,
      existing,
      resolution: "useExisting",
    });
  }

  return conflicts;
}

export function applyKeyImport(
  keyId: string,
  keyExport: KeyExport,
  conflicts: MacroConflict[],
  profile: DeviceProfile,
): DeviceProfile {
  let updatedProfile: DeviceProfile = {
    ...profile,
    macros: [...profile.macros],
  };

  // Build remap table for "duplicate" resolutions
  const remapTable = new Map<string, string>();
  for (const conflict of conflicts) {
    if (conflict.resolution === "duplicate") {
      remapTable.set(conflict.imported.id, v4());
    }
  }

  const conflictIds = new Set(conflicts.map((c) => c.imported.id));

  // Add new macros (no conflict, not already in profile)
  for (const macro of keyExport.macros) {
    if (conflictIds.has(macro.id)) continue;
    const existsInProfile = updatedProfile.macros.some(
      (m) => m.id === macro.id,
    );
    if (!existsInProfile) {
      updatedProfile = {
        ...updatedProfile,
        macros: [...updatedProfile.macros, macro],
      };
    }
    // If exists and identical (no conflict was generated), it's a dedup — no-op
  }

  // Handle conflicts
  for (const conflict of conflicts) {
    switch (conflict.resolution) {
      case "duplicate": {
        const newId = remapTable.get(conflict.imported.id)!;
        updatedProfile = {
          ...updatedProfile,
          macros: [
            ...updatedProfile.macros,
            { ...conflict.imported, id: newId },
          ],
        };
        break;
      }
      case "overwrite": {
        updatedProfile = {
          ...updatedProfile,
          macros: updatedProfile.macros.map((m) =>
            m.id === conflict.imported.id ? conflict.imported : m,
          ),
        };
        break;
      }
      case "useExisting":
        // No-op
        break;
    }
  }

  // Regenerate all layer IDs to prevent duplication when importing same file to multiple keys
  const newLayers = regenerateLayerIds(keyExport.layers);

  // Remap macro refs for duplicated macros
  const remappedLayers = remapMacroRefs(newLayers, remapTable);

  // Apply new layers to the key
  updatedProfile = updateKeyLayers(keyId, updatedProfile, () => remappedLayers);

  return updatedProfile;
}

function regenerateLayerIds(layers: DeviceLayers): DeviceLayers {
  return {
    defaultLayer: { ...layers.defaultLayer, id: v4() },
    layers: layers.layers.map((tl) => ({
      ...tl,
      layer: { ...tl.layer, id: v4() },
    })),
  };
}

function remapMacroRefs(
  layers: DeviceLayers,
  remapTable: Map<string, string>,
): DeviceLayers {
  if (remapTable.size === 0) return layers;

  const remapLayer = (layer: DeviceKeyLayer): DeviceKeyLayer => ({
    ...layer,
    macros: layer.macros.map((id) => remapTable.get(id) ?? id),
  });

  return {
    defaultLayer: remapLayer(layers.defaultLayer),
    layers: layers.layers.map((tl) => ({
      ...tl,
      layer: remapLayer(tl.layer),
    })),
  };
}
