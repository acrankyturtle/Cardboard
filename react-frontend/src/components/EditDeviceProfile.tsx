import clsx, { ClassValue } from "clsx";
import { Button, getButtonClassName } from "./Button.tsx";
import { ListBox, ListBoxItem } from "./ListBox.tsx";
import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DeviceKey,
  DeviceKeyLayer,
  DeviceLayers,
  DeviceMacro,
  DeviceProfile,
  isTaggedDeviceLayer,
  KeyColor,
  TaggedDeviceLayer,
  VirtualKey,
} from "../api/devices.ts";
import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogConfirmButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderDescription,
  DialogHeaderTitle,
} from "./Dialog.tsx";
import {
  deleteMacro,
  EditDeviceState,
  findKeyById,
  findMacroById,
  findSelectedProfileLayer,
  getActiveLayer,
  getMacroUsages,
  getSelectedKeyProfileLayers,
  getTaggedLayerName,
  getTagsInProfile,
  getVirtualKeyId,
  insertLayer,
  newTaggedLayer,
  removeLayer,
  updateKeyLayers,
  updateLayerBindings,
  useEditDeviceContext,
} from "../lib/editDeviceContext.tsx";
import { KeyRenderer } from "./KeyRenderer.tsx";
import {
  Field,
  Fieldset,
  Input,
  Label,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import { InputClassName } from "./Input.tsx";
import { SequenceEditor } from "./SequenceEditor.tsx";
import { EditTaggedLayerDialog } from "./EditTaggedLayerDialog.tsx";
import {
  createEndSequenceActionEvent,
  createStartSequenceActionEvent,
} from "../lib/actionEventUtils.ts";
import {
  AddIcon,
  ExportIcon,
  ImportIcon,
  KeyboardIcon,
  MacroIcon,
  PasteIcon,
  RemoveIcon,
} from "../assets/sharedIcons.tsx";
import {
  downloadJsonFile,
  pickAndReadJsonFile,
} from "../lib/jsonFileUtils.ts";
import { TemplatePanel } from "./MacroTemplates.tsx";

export function EditDeviceProfile({ className }: { className?: string }) {
  return (
    <>
      <div className={clsx("flex gap-0.5 bg-stone-950", className)}>
        <div className="grid min-w-56 grid-rows-2 flex-col gap-0.5">
          <TagsPanel />
          <KeysPanel showPhysicalKeys showVirtualKeys />
        </div>
        <div className="flex grow flex-col">
          <KeyViewPanel className="m-4 grow" />
          <VirtualKeyPanel className="mx-10 mb-4" />
        </div>
        <div className="grid min-w-96 grid-rows-2 gap-0.5">
          <LayersPanel />
          <BindingsPanel className="min-w-96" />
        </div>
        <MacrosPanel className="min-w-96" />
      </div>
      <EditTaggedLayerDialog />
      <EditMacroDialog />
    </>
  );
}

function HeaderBar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "sticky top-0 flex h-9 shrink-0 items-center gap-1 border-b border-stone-950 bg-stone-700 p-1 text-lg tracking-widest",
        className,
      )}
    >
      {children}
    </div>
  );
}

const headerBarIconClass = "size-6 text-stone-100";

const headerBarButtonClass = clsx(
  headerBarIconClass,
  getButtonClassName({
    variant: "toolbar",
    padding: "none",
  }),
);

function TagsPanel({ className }: { className?: string }) {
  const { state, dispatch } = useEditDeviceContext();
  const tags = useMemo(() => getTagsInProfile(state.profile), [state.profile]);

  const tagItems = useMemo(() => {
    return tags.map((t) => ({ label: t, value: t }));
  }, [tags]);

  const selectedTags = useMemo(() => {
    return state.selectedTags.map((t) => ({ label: t, value: t }));
  }, [state.selectedTags]);

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <TagsIcon />
        </div>
        <div className="grow">Tags</div>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            dispatch({ type: "setSelectedTags", tags });
          }}
        >
          <SelectAllIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            dispatch({ type: "setSelectedTags", tags: [] });
          }}
        >
          <DeselectIcon />
        </button>
      </HeaderBar>
      <ListBox
        items={tagItems}
        selected={selectedTags}
        setSelected={(items) =>
          dispatch({ type: "setSelectedTags", tags: items.map((i) => i.value) })
        }
        variant={"yellow"}
        isMultiSelect
        renderItem={(item) => {
          return (
            <div className="flex size-full">
              <div className="grow">{item.label}</div>
            </div>
          );
        }}
      />
    </PanelContainer>
  );
}

function KeyViewPanel({ className }: { className?: string }) {
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

function Key({
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

const getActionLabelForMacros = (macros: readonly DeviceMacro[]): string => {
  switch (macros.length) {
    case 0:
      return "";
    case 1:
      return macros[0].name;
    default:
      return `[${macros.length} macros]`;
  }
};

const keyColorToClassName = (
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

function VirtualKeyPanel({ className }: { className?: string }) {
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
      <div className="flex flex-wrap justify-center">
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

function KeysPanel({
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

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <KeyboardIcon />
        </div>
        <div className="grow">
          {showPhysicalKeys ? "Keys" : showVirtualKeys ? "Virtual Keys" : "???"}
        </div>
      </HeaderBar>
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
    </PanelContainer>
  );
}

const getLayerCount = (keyId: string, profile: DeviceProfile): number =>
  profile.keys.find((k) => k.id === keyId)?.layers.layers.length ?? 0;

function BindingsPanel({ className }: { className?: string }) {
  const { state, dispatch } = useEditDeviceContext();

  const selectedLayer = findSelectedProfileLayer(state);
  const bindings = selectedLayer
    ? isTaggedDeviceLayer(selectedLayer)
      ? selectedLayer.layer.macros
      : selectedLayer.macros
    : undefined;

  const macros: readonly ({ index: number } & ListBoxItem)[] =
    bindings?.map((m, i) => {
      const macro = findMacroById(m, state.profile);
      return macro
        ? { label: macro.name, value: macro.id, index: i }
        : { label: "(unknown)", value: m, index: i };
    }) ?? [];

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <MacroIcon />
        </div>
        <div className="grow">Bindings</div>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            dispatch({
              type: "setSelectedBindings",
              index: macros.map((m) => m.index),
            });
          }}
        >
          <SelectAllIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            dispatch({ type: "setSelectedBindings", index: [] });
          }}
        >
          <DeselectIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            if (
              !state.selectedKey ||
              !state.selectedLayer ||
              !state.selectedMacro ||
              !bindings
            )
              return;

            if (bindings.some((m) => m === state.selectedMacro)) return;

            dispatch({
              type: "setProfile",
              profile: updateLayerBindings(
                state.selectedKey,
                state.selectedLayer,
                state.profile,
                [...bindings, state.selectedMacro],
              ),
            });

            dispatch({ type: "setSelectedBindings", index: [bindings.length] });
          }}
        >
          <AddIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            if (
              !state.selectedKey ||
              !state.selectedLayer ||
              state.selectedBinding === null ||
              !bindings
            )
              return;
            dispatch({
              type: "setProfile",
              profile: updateLayerBindings(
                state.selectedKey,
                state.selectedLayer,
                state.profile,
                bindings.filter(
                  (_, i) => !state.selectedBinding.some((b) => b === i),
                ),
              ),
            });
            dispatch({
              type: "setSelectedBindings",
              index: [],
            });
          }}
        >
          <RemoveIcon />
        </button>
      </HeaderBar>
      <ListBox
        className="grow"
        items={macros}
        isMultiSelect
        selected={state.selectedBinding.map((i) => macros[i])}
        setSelected={(v) =>
          dispatch({
            type: "setSelectedBindings",
            index: v.map((item) => item.index),
          })
        }
        onDoubleClick={(item) =>
          dispatch({ type: "setSelectedMacro", macroId: item.value })
        }
        onDelete={(items) => {
          if (
            !state.selectedKey ||
            !state.selectedLayer ||
            state.selectedBinding === null ||
            !bindings
          )
            return;
          dispatch({
            type: "setProfile",
            profile: updateLayerBindings(
              state.selectedKey,
              state.selectedLayer,
              state.profile,
              bindings.filter((_, i) => !items.some((b) => b.index === i)),
            ),
          });
          dispatch({
            type: "setSelectedBindings",
            index: [],
          });
        }}
      />
    </PanelContainer>
  );
}

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

function LayersPanel({ className }: { className?: string }) {
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

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <LayersIcon />
        </div>
        <div className="grow">Layers</div>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            if (!state.selectedKey) return;
            const newLayer = newTaggedLayer();
            const updated = insertLayer(
              state.selectedKey,
              state.profile,
              state.selectedLayer,
              newLayer,
            );
            dispatch({ type: "setProfile", profile: updated });
            dispatch({ type: "setSelectedLayer", layerId: newLayer.layer.id });
          }}
        >
          <AddIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            if (
              !state.selectedKey ||
              !state.selectedLayer ||
              !selectedLayer ||
              isSelectedLayerDefaultLayer === undefined
            )
              return;

            if (isSelectedLayerDefaultLayer) return;

            const newSelectedIndex = Math.min(
              Math.max(
                layers.findIndex((l) => l.value === state.selectedLayer) + 1,
                0,
              ),
              layers.length - 1,
            );
            const newSelected = layers[newSelectedIndex];
            const updated = removeLayer(
              state.selectedKey,
              state.profile,
              state.selectedLayer,
            );
            dispatch({ type: "setProfile", profile: updated });
            dispatch({
              type: "setSelectedLayer",
              layerId: newSelected.value,
            });
          }}
          disabled={isSelectedLayerDefaultLayer}
        >
          <RemoveIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            const selectedLayer = state.selectedLayer;
            if (!state.selectedKey || !selectedLayer) return;
            const updatedProfile = updateKeyLayers(
              state.selectedKey,
              state.profile,
              (layers) => shiftLayer(selectedLayer, layers, -1),
            );
            dispatch({ type: "setProfile", profile: updatedProfile });
            dispatch({
              type: "setSelectedLayer",
              layerId: state.selectedLayer,
            });
          }}
        >
          <MoveUpIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            const selectedLayer = state.selectedLayer;
            if (!state.selectedKey || !selectedLayer) return;
            const updatedProfile = updateKeyLayers(
              state.selectedKey,
              state.profile,
              (layers) => shiftLayer(selectedLayer, layers, 1),
            );
            dispatch({ type: "setProfile", profile: updatedProfile });
            dispatch({
              type: "setSelectedLayer",
              layerId: state.selectedLayer,
            });
          }}
        >
          <MoveDownIcon />
        </button>
      </HeaderBar>
      <ListBox
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
    </PanelContainer>
  );
}

const shiftLayer = (
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

function isValidMacro(data: unknown): data is DeviceMacro {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.name === "string" &&
    Array.isArray(d.cutChannels) &&
    d.startSequence != null &&
    d.loopSequence != null &&
    d.endSequence != null
  );
}

function MacrosPanel({ className }: { className?: string }) {
  const { state, dispatch } = useEditDeviceContext();

  const macros: readonly ListBoxItem[] = useMemo(
    () =>
      state.profile.macros.map((m) => {
        return { label: m.name, value: m.id };
      }),
    [state],
  );

  const { selectedMacro, selectedMacroUsages } = useMemo(() => {
    if (!state.selectedMacro) return {};
    const selectedMacro =
      macros.find((l) => l.value === state.selectedMacro) ?? null;
    const selectedMacroUsages = getMacroUsages(
      state.selectedMacro,
      state.profile,
    ).length;
    return { selectedMacro, selectedMacroUsages };
  }, [state]);

  return (
    <PanelContainer className={className}>
      <HeaderBar>
        <div className="size-5">
          <MacroIcon />
        </div>
        <div className="grow">Macros</div>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            dispatch({
              type: "setModal",
              modal: {
                type: "editMacro",
                show: true,
                macro: {
                  id: crypto.randomUUID(),
                  name: "New Macro",
                  cutChannels: [],
                  startSequence: { actions: [] },
                  loopSequence: { actions: [] },
                  endSequence: { actions: [] },
                },
              },
            });
          }}
        >
          <AddIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            if (!state.selectedMacro) return;
            const macro = findMacroById(state.selectedMacro, state.profile);
            if (!macro) return;
            const { id: _, ...macroWithoutId } = macro;
            navigator.clipboard.writeText(
              JSON.stringify(macroWithoutId, null, 2),
            );
          }}
          disabled={state.selectedMacro === null}
        >
          <CopyIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              const data = JSON.parse(text);
              if (!isValidMacro(data)) return;
              dispatch({
                type: "setModal",
                modal: {
                  type: "editMacro",
                  show: true,
                  macro: { ...data, id: crypto.randomUUID() },
                },
              });
            } catch {
              // invalid clipboard content — silently ignore
            }
          }}
        >
          <PasteIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={async () => {
            const data = await pickAndReadJsonFile<DeviceMacro>();
            if (!data || !isValidMacro(data)) return;
            dispatch({
              type: "setModal",
              modal: {
                type: "editMacro",
                show: true,
                macro: { ...data, id: crypto.randomUUID() },
              },
            });
          }}
        >
          <ImportIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            if (!state.selectedMacro) return;
            const macro = findMacroById(state.selectedMacro, state.profile);
            if (!macro) return;
            const { id: _, ...macroWithoutId } = macro;
            downloadJsonFile(macroWithoutId, `${macro.name}-macro.json`);
          }}
          disabled={state.selectedMacro === null}
        >
          <ExportIcon />
        </button>
        <button
          className={headerBarButtonClass}
          onClick={() => {
            if (!state.selectedMacro) return;
            const result = deleteMacro(state.selectedMacro, state.profile);
            if (result === "in use") return;

            // get macro id i+1 where i is the index of the deleted macro
            const index = state.profile.macros.findIndex(
              (m) => m.id === state.selectedMacro,
            );

            const newSelectedMacro =
              index < 0 || state.profile.macros.length === 1
                ? null
                : index + 1 < state.profile.macros.length
                  ? state.profile.macros[index + 1].id
                  : state.profile.macros[index - 1].id;

            dispatch({ type: "setProfile", profile: result });

            if (newSelectedMacro !== null) {
              dispatch({ type: "setSelectedMacro", macroId: newSelectedMacro });
            }
          }}
          disabled={selectedMacroUsages !== 0}
        >
          <RemoveIcon />
        </button>
      </HeaderBar>
      <ListBox
        className="grow"
        variant="blue"
        renderItem={(item) => <MacroListItem item={item} />}
        items={macros}
        selected={selectedMacro}
        setSelected={(v) =>
          dispatch({ type: "setSelectedMacro", macroId: v.value })
        }
        onDoubleClick={(item) => {
          const macro = findMacroById(item.value, state.profile);
          if (!macro) return;
          dispatch({
            type: "setModal",
            modal: {
              type: "editMacro",
              show: true,
              macro,
            },
          });
        }}
      />
    </PanelContainer>
  );
}

function MacroListItem({ item }: { item: ListBoxItem }) {
  const { state } = useEditDeviceContext();
  const usageCount = useMemo(() => {
    return getMacroUsages(item.value, state.profile).length;
  }, [state]);
  return (
    <div className="flex">
      <div
        className={clsx("grow", {
          "text-stone-400": usageCount < 1,
        })}
      >
        {item.label}
      </div>
      <div className="text-stone-400 italic">
        {usageCount < 1 ? "(no usages)" : null}
      </div>
    </div>
  );
}

function EditMacroDialog() {
  const { state, dispatch } = useEditDeviceContext();
  const [isTemplateEditing, setIsTemplateEditing] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const showModal =
    state.modal !== null &&
    state.modal.type === "editMacro" &&
    state.modal.show;

  const { macro, setMacro } = useMemo(() => {
    if (!state.modal || state.modal.type !== "editMacro" || !state.modal.show)
      return {};

    const macro = state.modal.macro;
    const setMacro = (m: DeviceMacro) => {
      if (!state.modal || state.modal.type !== "editMacro" || !state.modal.show)
        return;
      dispatch({
        type: "setModal",
        modal: { ...state.modal, macro: m },
      });
    };

    return { macro, setMacro };
  }, [state]);

  const closeModal = useCallback(() => {
    dispatch({ type: "setModal", modal: null });
  }, [dispatch]);

  if (!macro) return <></>;

  const numberOfUsages = getMacroUsages(macro.id, state.profile).length;
  const isNew =
    numberOfUsages === 0 &&
    !state.profile.macros.some((m) => m.id === macro.id);

  return (
    <Dialog
      className="w-5xl"
      open={showModal}
      onClose={closeModal}
      closeOnBackdropClick={false}
    >
      <DialogHeader>
        <DialogHeaderTitle className="text-lg font-bold">
          Edit Macro
        </DialogHeaderTitle>
        <DialogHeaderDescription>
          {isNew ? (
            "New macro"
          ) : numberOfUsages > 1 ? (
            <div className="font-semibold text-sky-300">
              {numberOfUsages} usages
            </div>
          ) : numberOfUsages === 1 ? (
            "1 usage"
          ) : (
            "Unused"
          )}
        </DialogHeaderDescription>
      </DialogHeader>
      <DialogDivider />
      <DialogBody className="gap-y-5">
        <Fieldset className="space-y-4">
          <Field className="flex flex-col gap-1">
            <Label>Name</Label>
            <Input
              className={clsx("w-full", InputClassName)}
              type="text"
              maxLength={255}
              value={macro.name}
              onChange={(e) => setMacro({ ...macro, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-[1fr_2fr] gap-x-6">
            <Field className="flex flex-col gap-1">
              <Label className="flex items-center gap-2">
                Play Channel
                <ChannelSummaryLink
                  profile={state.profile}
                  currentMacro={macro}
                />
              </Label>
              <Input
                className={clsx("w-full", InputClassName)}
                type="number"
                min={0}
                max={255}
                value={macro.playChannel ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setMacro({
                    ...macro,
                    playChannel: value === "" ? undefined : parseInt(value, 10),
                  });
                }}
                placeholder="None"
              />
            </Field>
            <CutChannelsField
              value={macro.cutChannels}
              onChange={(channels) =>
                setMacro({ ...macro, cutChannels: channels })
              }
            />
          </div>
        </Fieldset>
        <DialogDivider />
        <TabGroup
          className="space-y-4"
          selectedIndex={tabIndex}
          onChange={(index) => {
            // Prevent switching to sequences when template is being edited
            if (isTemplateEditing && index === 0) return;
            setTabIndex(index);
          }}
        >
          <TabList className="space-x-1">
            <Tab
              as={Button}
              className="px-4"
              buttonStyle={{ variant: "navbar" }}
              disabled={isTemplateEditing}
            >
              Sequences
            </Tab>
            <Tab
              as={Button}
              className="px-4"
              buttonStyle={{ variant: "navbar" }}
            >
              Templates
            </Tab>
          </TabList>
          <TabPanels className="h-96 rounded-lg border border-stone-900 bg-stone-800">
            <TabPanel
              tabIndex={-1}
              className="grid size-full grid-cols-3 gap-2 p-2"
            >
              <SequenceEditor
                type="start"
                value={macro?.startSequence ?? { actions: [] }}
                setValue={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, startSequence: s });
                }}
                transformActionEvent={(event) =>
                  createStartSequenceActionEvent(
                    event,
                    macro?.endSequence,
                    macro?.startSequence,
                  )
                }
                onCopyToOther={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, endSequence: s });
                }}
              />
              <SequenceEditor
                type="loop"
                value={macro?.loopSequence ?? { actions: [] }}
                setValue={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, loopSequence: s });
                }}
              />
              <SequenceEditor
                type="end"
                value={macro?.endSequence ?? { actions: [] }}
                setValue={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, endSequence: s });
                }}
                transformActionEvent={(event) =>
                  createEndSequenceActionEvent(
                    event,
                    macro?.startSequence,
                    macro?.endSequence,
                  )
                }
                onCopyToOther={(s) => {
                  if (!macro) return;
                  setMacro({ ...macro, startSequence: s });
                }}
              />
            </TabPanel>
            <TabPanel tabIndex={-1} className="size-full p-3">
              <TemplatePanel
                setMacro={(result) => {
                  setMacro({
                    ...macro,
                    startSequence: result.start,
                    loopSequence: result.loop,
                    endSequence: result.end,
                  });
                }}
                onEditingChange={setIsTemplateEditing}
                currentMacro={
                  macro
                    ? {
                        start: macro.startSequence,
                        loop: macro.loopSequence,
                        end: macro.endSequence,
                      }
                    : undefined
                }
                onSwitchToSequences={() => setTabIndex(0)}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </DialogBody>
      <DialogFooter>
        <div className="grow" />
        <DialogConfirmButton
          onClick={() => {
            if (!showModal || !macro) return;
            const exists = findMacroById(macro.id, state.profile) !== null;
            const updated = {
              ...state.profile,
              macros: exists
                ? state.profile.macros.map((m) =>
                    m.id === macro.id ? macro : m,
                  )
                : [...state.profile.macros, macro],
            };
            dispatch({
              type: "setProfile",
              profile: updated,
            });
            dispatch({
              type: "setModal",
              modal: null,
            });
            dispatch({
              type: "setSelectedMacro",
              macroId: macro.id,
            });
          }}
        >
          Confirm
        </DialogConfirmButton>
        <DialogCancelButton onClick={closeModal}>Cancel</DialogCancelButton>
      </DialogFooter>
    </Dialog>
  );
}

function PanelContainer({
  className,
  children,
  ref,
}: {
  className?: string;
  children?: ReactNode;
  ref?: (element: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={ref}
      className={clsx("flex flex-col overflow-y-auto bg-stone-800", className)}
    >
      {children}
    </div>
  );
}

function TagsIcon() {
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
      <path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3z" />
    </svg>
  );
}


function CopyIcon() {
  return (
    <svg
      className="p-0.5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" />
      <path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" />
    </svg>
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

function SelectAllIcon() {
  return (
    <svg
      className="size-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 8m0 1a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1z" />
      <path d="M12 20v.01" />
      <path d="M16 20v.01" />
      <path d="M8 20v.01" />
      <path d="M4 20v.01" />
      <path d="M4 16v.01" />
      <path d="M4 12v.01" />
      <path d="M4 8v.01" />
      <path d="M4 4v.01" />
      <path d="M8 4v.01" />
      <path d="M12 4v.01" />
      <path d="M16 4v.01" />
      <path d="M20 4v.01" />
      <path d="M20 8v.01" />
      <path d="M20 12v.01" />
      <path d="M20 16v.01" />
      <path d="M20 20v.01" />
    </svg>
  );
}

function DeselectIcon() {
  return (
    <svg
      className="size-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8h3a1 1 0 0 1 1 1v3" />
      <path d="M16 16h-7a1 1 0 0 1 -1 -1v-7" />
      <path d="M12 20v.01" />
      <path d="M16 20v.01" />
      <path d="M8 20v.01" />
      <path d="M4 20v.01" />
      <path d="M4 16v.01" />
      <path d="M4 12v.01" />
      <path d="M4 8v.01" />
      <path d="M8 4v.01" />
      <path d="M12 4v.01" />
      <path d="M16 4v.01" />
      <path d="M20 4v.01" />
      <path d="M20 8v.01" />
      <path d="M20 12v.01" />
      <path d="M20 16v.01" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

function CutChannelsField({
  value,
  onChange,
}: {
  value: readonly number[];
  onChange: (channels: number[]) => void;
}) {
  const [inputValue, setInputValue] = useState(value.join(", "));

  // Sync input when external value changes (e.g., when switching macros)
  useEffect(() => {
    setInputValue(value.join(", "));
  }, [value]);

  const parseAndUpdate = () => {
    const channels = inputValue
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 255);
    onChange(channels);
    // Also normalize the display
    setInputValue(channels.join(", "));
  };

  return (
    <Field className="flex flex-col gap-1">
      <Label>Cut Channels</Label>
      <Input
        className={clsx("w-full", InputClassName)}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={parseAndUpdate}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            parseAndUpdate();
          }
        }}
        placeholder="e.g. 1, 2, 3"
      />
    </Field>
  );
}

function ChannelSummaryLink({
  profile,
  currentMacro,
}: {
  profile: DeviceProfile;
  currentMacro: DeviceMacro;
}) {
  const [showDialog, setShowDialog] = useState(false);

  // Collect all channel usage info, using currentMacro instead of the saved version
  const channelInfo = useMemo(() => {
    const playChannels = new Map<number, string[]>();
    const cutChannels = new Map<number, string[]>();

    // Build macro list: replace existing macro with currentMacro, or add if new
    const macros = profile.macros.some((m) => m.id === currentMacro.id)
      ? profile.macros.map((m) => (m.id === currentMacro.id ? currentMacro : m))
      : [...profile.macros, currentMacro];

    for (const macro of macros) {
      if (macro.playChannel !== undefined) {
        const existing = playChannels.get(macro.playChannel) ?? [];
        playChannels.set(macro.playChannel, [...existing, macro.name]);
      }
      for (const channel of macro.cutChannels) {
        const existing = cutChannels.get(channel) ?? [];
        cutChannels.set(channel, [...existing, macro.name]);
      }
    }

    // Get all unique channels
    const allChannels = new Set([
      ...playChannels.keys(),
      ...cutChannels.keys(),
    ]);
    const sortedChannels = [...allChannels].sort((a, b) => a - b);

    return { playChannels, cutChannels, sortedChannels };
  }, [profile.macros, currentMacro]);

  return (
    <>
      <button
        type="button"
        className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
        onClick={() => setShowDialog(true)}
      >
        (view all)
      </button>
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        className="w-2xl"
      >
        <DialogHeader>
          <DialogHeaderTitle>Channel Summary</DialogHeaderTitle>
          <DialogHeaderDescription>
            Overview of all channels used in this profile
          </DialogHeaderDescription>
        </DialogHeader>
        <DialogDivider />
        <DialogBody className="max-h-80 overflow-y-auto">
          {channelInfo.sortedChannels.length === 0 ? (
            <div className="text-stone-400 italic">
              No channels are currently in use.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {channelInfo.sortedChannels.map((channel) => {
                const playMacros = channelInfo.playChannels.get(channel) ?? [];
                const cutMacros = channelInfo.cutChannels.get(channel) ?? [];
                return (
                  <div
                    key={channel}
                    className="flex flex-col gap-1 rounded-md bg-stone-800 px-2 pt-1 pb-2 shadow shadow-black/25"
                  >
                    <div className="font-semibold text-violet-300">
                      Channel #{channel}
                    </div>
                    {playMacros.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {playMacros.map((name) => (
                          <ChannelSummaryMacro key={name}>
                            {name}
                          </ChannelSummaryMacro>
                        ))}
                      </div>
                    )}
                    {cutMacros.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-sm text-stone-400">Cut by:</span>
                        {cutMacros.map((name) => (
                          <ChannelSummaryMacro key={name}>
                            {name}
                          </ChannelSummaryMacro>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogBody>
        <DialogFooter className="justify-end">
          <DialogCancelButton onClick={() => setShowDialog(false)}>
            Close
          </DialogCancelButton>
        </DialogFooter>
      </Dialog>
    </>
  );
}

function ChannelSummaryMacro({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-blue-900 px-2 py-0.5 text-xs">{children}</span>
  );
}
