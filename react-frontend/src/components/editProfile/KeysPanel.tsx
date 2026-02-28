import { useMemo } from "react";
import {
  DeviceKey,
  DeviceProfile,
  VirtualKey,
} from "../../api/devices.ts";
import { ListBox, ListBoxItem } from "../ListBox.tsx";
import { GreenListItem } from "../ListItem.tsx";
import {
  findKeyById,
  getVirtualKeyId,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import {
  ExportIcon,
  ImportIcon,
  KeyboardIcon,
} from "../../assets/sharedIcons.tsx";
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
} from "../ContextMenu.tsx";
import {
  useKeyImportExport,
  KeyImportExportMenuItems,
} from "./keyImportExportMenu.tsx";

interface KeyListBoxItem extends ListBoxItem {
  key: DeviceKey | VirtualKey;
}

export function KeysPanel({
  className,
  showPhysicalKeys,
  showVirtualKeys,
}: {
  className?: string;
  showPhysicalKeys?: boolean;
  showVirtualKeys?: boolean;
}) {
  const { state, dispatch } = useEditDeviceContext();
  const device = state.device;

  const keys: KeyListBoxItem[] = useMemo(() => {
    const physicalKeys = showPhysicalKeys
      ? device.keyMap
          .map((k) => {
            const key = findKeyById(k.keyId, state);
            return {
              label: k.name,
              value: k.keyId,
              key: key!,
            };
          })
          .filter((k) => k.key)
      : [];

    const virtualKeys = showVirtualKeys
      ? Array.from({ length: device.virtualKeyCount }, (_, i) => {
          const id = getVirtualKeyId(i);
          const key = findKeyById(id, state);
          return {
            label: `VK-${i + 1}`,
            value: id,
            key: key!,
          };
        }).filter((k) => k.key)
      : [];

    return [...physicalKeys, ...virtualKeys];
  }, [device, state, showPhysicalKeys, showVirtualKeys]);

  const selectedKey = useMemo(
    () =>
      state.selectedKey
        ? (keys.find((k) => k.value == state.selectedKey) ?? null)
        : null,
    [state],
  );

  const { importKey, exportKey, hasSelectedKey } = useKeyImportExport();

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <KeyboardIcon />
        </div>
        <div>
          {showPhysicalKeys ? "Keys" : showVirtualKeys ? "Virtual Keys" : "???"}
        </div>
        <HelpLink className="shrink-0" section="keys-bindings" />
        <div className="grow" />
        <Tooltip content="Import key">
          <HeaderBarButton disabled={!hasSelectedKey} onClick={importKey}>
            <ImportIcon />
          </HeaderBarButton>
        </Tooltip>
        <Tooltip content="Export key">
          <HeaderBarButton disabled={!hasSelectedKey} onClick={exportKey}>
            <ExportIcon />
          </HeaderBarButton>
        </Tooltip>
      </HeaderBar>
      <ContextMenu>
        <ContextMenuTrigger>
          <ListBox
            className="grow"
            items={keys}
            selected={selectedKey}
            setSelected={(v) =>
              dispatch({ type: "setSelectedKey", keyId: v.value })
            }
            renderItem={(item, selected) => {
              const layerCount = getLayerCount(item.value, state.profile);
              return (
                <GreenListItem selected={selected}>
                  <div className="flex size-full">
                    <div className="grow">{item.label}</div>
                    {layerCount > 0 && <div>{layerCount}</div>}
                  </div>
                </GreenListItem>
              );
            }}
          />
        </ContextMenuTrigger>
        <ContextMenuPopup>
          <KeyImportExportMenuItems />
        </ContextMenuPopup>
      </ContextMenu>
    </PanelContainer>
  );
}

export const getLayerCount = (keyId: string, profile: DeviceProfile): number =>
  profile.keys.find((k) => k.id === keyId)?.layers.layers.length ?? 0;
