import { ExportIcon, ImportIcon } from "../../assets/sharedIcons.tsx";
import {
  downloadJsonFile,
  pickAndReadJsonFile,
} from "../../lib/jsonFileUtils.ts";
import {
  applyKeyImport,
  buildKeyExport,
  detectConflicts,
  isValidKeyExport,
  KeyExport,
} from "../../lib/keyImportExport.ts";
import { useEditDeviceContext } from "../../lib/editDeviceContext.tsx";
import { ContextMenuItem, ContextMenuIcon } from "../ContextMenu.tsx";

export function useKeyImportExport() {
  const { state, dispatch } = useEditDeviceContext();

  const importKey = async () => {
    if (!state.selectedKey) return;
    const data = await pickAndReadJsonFile<KeyExport>(".key.json");
    if (!data || !isValidKeyExport(data)) return;
    const conflicts = detectConflicts(data, state.profile);
    if (conflicts.length === 0) {
      const updatedProfile = applyKeyImport(
        state.selectedKey,
        data,
        [],
        state.profile,
      );
      dispatch({
        type: "setProfile",
        profile: updatedProfile,
        description: "Import key",
      });
    } else {
      dispatch({
        type: "setModal",
        modal: {
          type: "importKey",
          show: true,
          keyExport: data,
          conflicts,
        },
      });
    }
  };

  const exportKey = () => {
    if (!state.selectedKey) return;
    const keyExport = buildKeyExport(state.selectedKey, state);
    if (!keyExport) return;
    const keyName =
      state.device.keyMap.find((k) => k.keyId === state.selectedKey)?.name ??
      "key";
    downloadJsonFile(keyExport, `${keyName}.key.json`);
  };

  return { importKey, exportKey, hasSelectedKey: !!state.selectedKey };
}

export function KeyImportExportMenuItems() {
  const { importKey, exportKey, hasSelectedKey } = useKeyImportExport();

  return (
    <>
      <ContextMenuItem disabled={!hasSelectedKey} onClick={importKey}>
        <ContextMenuIcon>
          <ImportIcon />
        </ContextMenuIcon>
        Import Key
      </ContextMenuItem>
      <ContextMenuItem disabled={!hasSelectedKey} onClick={exportKey}>
        <ContextMenuIcon>
          <ExportIcon />
        </ContextMenuIcon>
        Export Key
      </ContextMenuItem>
    </>
  );
}
