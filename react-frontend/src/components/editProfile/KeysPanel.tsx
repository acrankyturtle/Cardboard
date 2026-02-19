import clsx, { ClassValue } from "clsx";
import { CSSProperties, useMemo } from "react";
import {
  DeviceKey,
  DeviceMacro,
  DeviceProfile,
  KeyColor,
  VirtualKey,
} from "../../api/devices.ts";
import { ListBox, ListBoxItem } from "../ListBox.tsx";
import {
  findKeyById,
  getActiveLayer,
  getVirtualKeyId,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import { KeyRenderer } from "../KeyRenderer.tsx";
import {
  ExportIcon,
  ImportIcon,
  KeyboardIcon,
} from "../../assets/sharedIcons.tsx";
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
} from "../ContextMenu.tsx";
import {
  useKeyImportExport,
  KeyImportExportMenuItems,
} from "./keyImportExportMenu.tsx";

export function KeyViewPanel({ className }: { className?: string }) {
  const { state } = useEditDeviceContext();
  const device = state.device;
  return (
    <KeyRenderer
      className={className}
      keys={device.keyMap}
      renderKey={(key, keyClassName, style) => {
        return (
          <Key
            key={key.keyId}
            keyId={key.keyId}
            keyName={key.name}
            keyColor={key.color}
            keyClassName={keyClassName}
            keyStyle={style}
          />
        );
      }}
    />
  );
}

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

  return (
    <div
      className={clsx(keyClassName, { "p-0.5": !compact, "p-1": compact })}
      style={keyStyle}
    >
      <button
        className={clsx("group relative size-full cursor-pointer select-none", {
          "p-[3px]": !compact,
        })}
        onClick={() => dispatch({ type: "setSelectedKey", keyId: keyId })}
      >
        <div
          className={clsx(
            "inline-flex size-full items-center justify-center rounded-lg",
            keyColorToClassName(keyColor, isSelected),
            {
              "outline-lime-500": isSelected,
              "outline-3 outline-offset-3": isSelected && !compact,
              "outline-2 outline-offset-3": isSelected && compact,
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
            className={clsx("absolute", {
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
    </div>
  );
}

interface KeyListBoxItem extends ListBoxItem {
  key: DeviceKey | VirtualKey;
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

export function VirtualKeyPanel({ className }: { className?: string }) {
  const { state } = useEditDeviceContext();
  const device = state.device;
  const vks = useMemo(
    () =>
      Array.from({ length: device.virtualKeyCount }, (_, i) => {
        return {
          keyId: getVirtualKeyId(i),
          name: `${i + 1}`,

          layers: state.profile.virtualKeys[i]?.layers,
        };
      }).filter((vk) => vk),
    [state, device],
  );
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 rounded-2xl bg-stone-900 px-4 py-3",
        className,
      )}
    >
      <div>Virtual Keys</div>
      <div className="flex max-h-40 flex-wrap justify-center overflow-y-auto">
        {vks.map((vk) => (
          <Key
            key={vk.keyId}
            keyId={vk.keyId}
            keyName={vk.name}
            keyColor={KeyColor.Virtual}
            keyClassName="size-13"
            compact
          />
        ))}
      </div>
    </div>
  );
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
        <div className="grow">
          {showPhysicalKeys ? "Keys" : showVirtualKeys ? "Virtual Keys" : "???"}
        </div>
        <HelpLink className="shrink-0" section="keys-bindings" />
        <div className="grow" />
        <Tooltip content="Import key">
          <button
            className={headerBarButtonClass}
            disabled={!hasSelectedKey}
            onClick={importKey}
          >
            <ImportIcon />
          </button>
        </Tooltip>
        <Tooltip content="Export key">
          <button
            className={headerBarButtonClass}
            disabled={!hasSelectedKey}
            onClick={exportKey}
          >
            <ExportIcon />
          </button>
        </Tooltip>
      </HeaderBar>
      <ContextMenu>
        <ContextMenuTrigger>
          <ListBox
            className="grow"
            variant="green"
            items={keys}
            selected={selectedKey}
            setSelected={(v) =>
              dispatch({ type: "setSelectedKey", keyId: v.value })
            }
            renderItem={(item) => {
              const layerCount = getLayerCount(item.value, state.profile);
              return (
                <div className="flex size-full">
                  <div className="grow">{item.label}</div>
                  {layerCount > 0 && <div>{layerCount}</div>}
                </div>
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
