import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApplicationIconEmblem,
  AssociationData,
  createDefaultEmblem,
  createEmptyVirtualKeyAssociation,
  EMBLEM_POSITIONS,
  EMBLEM_SHAPES,
  EMPTY_INPUT_KEY,
  useAssociations,
  VirtualKeyAssociation,
} from "@root/react-frontend/src/api/associations.ts";
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
} from "@root/react-frontend/src/components/Dialog.tsx";
import { Button } from "@root/react-frontend/src/components/Button.tsx";
import { useDeviceList } from "@root/react-frontend/src/api/devices.ts";
import {
  ComboInput,
  ComboInputItem,
} from "@root/react-frontend/src/components/ComboInput.tsx";
import { HelpLink } from "@root/react-frontend/src/components/HelpLink.tsx";
import { ChipListInput } from "@root/react-frontend/src/components/ChipListInput.tsx";
import { Field, Fieldset, Input, Label } from "@headlessui/react";
import {
  AddIcon,
  RemoveIcon,
} from "@root/react-frontend/src/assets/sharedIcons.tsx";
import clsx from "clsx";
import { InputClassName } from "@root/react-frontend/src/components/Input.tsx";
import { InputKeySelector } from "@root/react-frontend/src/components/InputKeySelector.tsx";
import { Tooltip } from "@root/react-frontend/src/components/Tooltip.tsx";
import { getInputDevices, InputDeviceInfo } from "../api/inputDevices.ts";
import { LargeLoadingIndicator } from "@root/react-frontend/src/components/LoadingIndicator.tsx";
import { ToggleSwitch } from "@root/react-frontend/src/components/ToggleSwitch.tsx";
import { EmblemPreview } from "@root/react-frontend/src/components/EmblemPreview.tsx";

export function EditAssociationDialog({
  open,
  isNew,
  data,
  setData,
  onClose,
  onSave,
  error,
}: {
  open: boolean;
  isNew: boolean;
  data: AssociationData;
  setData: (data: AssociationData) => void;
  onClose: () => void;
  onSave: (data: AssociationData) => void;
  error: string | null;
}) {
  const { devices } = useDeviceList();
  const { associations } = useAssociations();
  const [showInputDevices, setShowInputDevices] = useState(false);

  // Build combined device list: connected devices by name + unconnected device IDs from associations
  const allDeviceItems: ComboInputItem[] = useMemo(() => {
    // Start with connected devices (these have names)
    const connectedDeviceIds = new Set(devices.map((d) => d.id));
    const items: ComboInputItem[] = devices.map((d) => ({
      id: d.id,
      name: d.name || `${d.model} (${d.id})`,
    }));

    // Collect all device IDs from all associations' virtual keys
    const associationDeviceIds = new Set<string>();
    for (const association of associations) {
      for (const vk of association.data.virtualKeys) {
        if (vk.deviceId && !connectedDeviceIds.has(vk.deviceId)) {
          associationDeviceIds.add(vk.deviceId);
        }
      }
    }

    // Add unconnected device IDs (using ID as name since we don't know the name)
    for (const deviceId of associationDeviceIds) {
      items.push({ id: deviceId, name: deviceId });
    }

    return items;
  }, [devices, associations]);

  const handleAddVirtualKey = useCallback(() => {
    const deviceId = allDeviceItems[0]?.id ?? "";
    setData({
      ...data,
      virtualKeys: [
        ...data.virtualKeys,
        createEmptyVirtualKeyAssociation(deviceId),
      ],
    });
  }, [data, setData, allDeviceItems]);

  const handleUpdateVirtualKey = useCallback(
    (index: number, vk: VirtualKeyAssociation) => {
      const virtualKeys = [...data.virtualKeys];
      virtualKeys[index] = vk;
      setData({ ...data, virtualKeys });
    },
    [data, setData],
  );

  const handleRemoveVirtualKey = useCallback(
    (index: number) => {
      setData({
        ...data,
        virtualKeys: data.virtualKeys.filter((_, i) => i !== index),
      });
    },
    [data, setData],
  );

  // Process inputs before save to ensure any pending edits are included
  const handleSaveWithProcess = useCallback(() => {
    const virtualKeys = data.virtualKeys.filter((v) => {
      return v.deviceMatching.inputKey !== EMPTY_INPUT_KEY;
    });
    onSave({ ...data, virtualKeys });
  }, [data, onSave]);

  return (
    <Dialog
      className="w-[40rem]"
      open={open}
      onClose={onClose}
      closeOnBackdropClick={false}
    >
      <DialogHeader>
        <DialogHeaderTitle className="flex items-center gap-2">
          {isNew ? "New Association" : "Edit Association"}
          <HelpLink section="associations" />
        </DialogHeaderTitle>
        <DialogHeaderDescription className="flex items-center gap-2">
          Configure tags and virtual keys to apply when an application matches
        </DialogHeaderDescription>
      </DialogHeader>
      <DialogDivider />
      <DialogBody scrollable className="max-h-[60vh]">
        <Fieldset className="space-y-4">
          <Field className="flex flex-col gap-1">
            <Label className="text-sm font-medium">Match Paths</Label>
            <ChipListInput
              layout="stacked"
              placeholder="Add path..."
              value={data.matchOnPath}
              onChange={(matchOnPath) => setData({ ...data, matchOnPath })}
            />
            <div className="text-xs text-stone-400">
              Tags apply when focused window path contains any of these strings.
            </div>
          </Field>
          <DialogDivider />
          <Field className="flex flex-col gap-1">
            <Label className="text-sm font-medium">Tags</Label>
            <ChipListInput
              placeholder="Add tag..."
              value={data.tags}
              onChange={(tags) => setData({ ...data, tags })}
            />
          </Field>
          <DialogDivider />
          <EmblemEditor
            emblem={data.emblem}
            onChange={(emblem) => setData({ ...data, emblem })}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Virtual Keys</Label>
              <Button
                className="gap-1 px-3 py-1 text-sm"
                buttonStyle={{ variant: "ghost" }}
                onClick={handleAddVirtualKey}
              >
                <div className="-my-2 -ml-1.5 size-5">
                  <AddIcon />
                </div>
                Add
              </Button>
            </div>
            {data.virtualKeys.length !== 0 && (
              <div className="flex flex-col gap-2">
                {data.virtualKeys.map((vk, index) => (
                  <VirtualKeyEditor
                    key={index}
                    virtualKey={vk}
                    deviceItems={allDeviceItems}
                    onChange={(updated) =>
                      handleUpdateVirtualKey(index, updated)
                    }
                    onRemove={() => handleRemoveVirtualKey(index)}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>
                Map input keys to virtual keys when this application is focused.
              </span>
              <Button
                buttonStyle={{ variant: "link" }}
                onClick={() => setShowInputDevices(true)}
              >
                View attached input devices
              </Button>
            </div>
          </div>
        </Fieldset>
      </DialogBody>
      <DialogFooter className="justify-end">
        {error && <div className="mr-auto text-red-400">{error}</div>}
        <DialogCancelButton onClick={onClose}>Cancel</DialogCancelButton>
        <DialogConfirmButton onClick={handleSaveWithProcess}>
          {isNew ? "Create" : "Save"}
        </DialogConfirmButton>
      </DialogFooter>
      <InputDevicesDialog
        open={showInputDevices}
        onClose={() => setShowInputDevices(false)}
      />
    </Dialog>
  );
}

function VirtualKeyEditor({
  virtualKey,
  deviceItems,
  onChange,
  onRemove,
}: {
  virtualKey: VirtualKeyAssociation;
  deviceItems: readonly ComboInputItem[];
  onChange: (vk: VirtualKeyAssociation) => void;
  onRemove: () => void;
}) {
  const [vk, setVk] = useState((virtualKey.virtualKey + 1).toString());
  const max = 32;

  // Find current device or create fallback item for unknown device ID
  const currentDeviceItem: ComboInputItem = useMemo(() => {
    const item = deviceItems.find((d) => d.id === virtualKey.deviceId);
    return item ?? { id: virtualKey.deviceId, name: virtualKey.deviceId };
  }, [deviceItems, virtualKey.deviceId]);

  const updateDeviceMatching = (
    updates: Partial<typeof virtualKey.deviceMatching>,
  ) => {
    onChange({
      ...virtualKey,
      deviceMatching: {
        ...virtualKey.deviceMatching,
        ...updates,
      },
    });
  };

  return (
    <div className="flex gap-2 rounded border border-stone-800 bg-stone-600 p-2">
      <div className="flex grow flex-col gap-2">
        <div className="flex items-center gap-3">
          <ComboInput
            className={clsx("min-w-72 grow text-sm", InputClassName)}
            value={currentDeviceItem}
            onChange={(item) => onChange({ ...virtualKey, deviceId: item.id })}
            items={deviceItems as ComboInputItem[]}
            noItemsMessage="(no devices found)"
            itemFromQuery={(query) => {
              const guid = parseGuid(query);
              return guid ? { id: guid, name: guid } : undefined;
            }}
          />
          <div className="flex items-center gap-1.5 text-sm">
            <span>VK</span>
            <Input
              className={clsx("w-14 text-center text-sm", InputClassName)}
              type="number"
              min={1}
              max={max}
              value={vk}
              onChange={(e) => setVk(e.target.value)}
              onBlur={() => {
                const newVk = parseVirtualKeyId(vk, virtualKey.virtualKey, max);
                onChange({
                  ...virtualKey,
                  virtualKey: newVk,
                });
                setVk((newVk + 1).toString());
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-12 text-stone-400">VID</span>
            <Input
              className={clsx("w-20 text-sm", InputClassName)}
              type="text"
              placeholder="any"
              value={virtualKey.deviceMatching.vid ?? ""}
              onChange={(e) =>
                updateDeviceMatching({
                  vid: e.target.value || undefined,
                })
              }
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-12 text-stone-400">PID</span>
            <Input
              className={clsx("w-20 text-sm", InputClassName)}
              type="text"
              placeholder="any"
              value={virtualKey.deviceMatching.pid ?? ""}
              onChange={(e) =>
                updateDeviceMatching({
                  pid: e.target.value || undefined,
                })
              }
            />
          </div>
          <div className="flex grow items-center gap-1.5 text-sm">
            <span className="w-12 text-stone-400">Serial</span>
            <Input
              className={clsx("grow text-sm", InputClassName)}
              type="text"
              placeholder="any"
              value={virtualKey.deviceMatching.serial ?? ""}
              onChange={(e) =>
                updateDeviceMatching({
                  serial: e.target.value || undefined,
                })
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex grow items-center gap-1.5 text-sm">
            <span className="w-12 text-stone-400">Desc</span>
            <Input
              className={clsx("grow text-sm", InputClassName)}
              type="text"
              placeholder="any"
              value={virtualKey.deviceMatching.description ?? ""}
              onChange={(e) =>
                updateDeviceMatching({
                  description: e.target.value || undefined,
                })
              }
            />
          </div>
          <InputKeySelector
            className="w-48"
            value={virtualKey.deviceMatching.inputKey}
            onChange={(inputKey) => updateDeviceMatching({ inputKey })}
          />
        </div>
      </div>
      <Tooltip content="Remove">
        <Button
          className="size-6 self-center p-1"
          buttonStyle={{ variant: "ghost", padding: "none" }}
          onClick={onRemove}
        >
          <RemoveIcon />
        </Button>
      </Tooltip>
    </div>
  );
}

function EmblemEditor({
  emblem,
  onChange,
}: {
  emblem: ApplicationIconEmblem | undefined;
  onChange: (emblem: ApplicationIconEmblem | undefined) => void;
}) {
  const enabled = emblem !== undefined;

  const handleToggle = (checked: boolean) => {
    onChange(checked ? createDefaultEmblem() : undefined);
  };

  return (
    <Field className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Icon Emblem</Label>
        <ToggleSwitch checked={enabled} onChange={handleToggle} />
      </div>
      {enabled && emblem ? (
        <div className="flex items-start gap-4 rounded border border-stone-800 bg-stone-600 p-3">
          <EmblemPreview emblem={emblem} size={64} />
          <div className="flex grow flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-stone-400">Position</div>
              <div className="grid w-fit grid-cols-2 gap-1">
                {EMBLEM_POSITIONS.map((p) => (
                  <Button
                    key={p.value}
                    className="text-xs"
                    buttonStyle={{
                      variant: "ghost",
                      isActive: emblem.position === p.value,
                    }}
                    onClick={() => onChange({ ...emblem, position: p.value })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-stone-400">Shape</div>
              <div className="flex w-fit gap-1">
                {EMBLEM_SHAPES.map((s) => (
                  <Button
                    key={s.value}
                    className="text-xs"
                    buttonStyle={{
                      variant: "ghost",
                      isActive: emblem.shape === s.value,
                    }}
                    onClick={() => onChange({ ...emblem, shape: s.value })}
                  >
                    <ShapeGlyph shape={s.value} />
                    <span className="ml-1.5">{s.label}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-stone-400">Color</div>
              <input
                type="color"
                className="h-7 w-12 cursor-pointer rounded border border-stone-800 bg-stone-800 p-0.5"
                value={emblem.color}
                onChange={(e) =>
                  onChange({ ...emblem, color: e.target.value.toLowerCase() })
                }
              />
              <span className="font-mono text-xs text-stone-400">
                {emblem.color}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-stone-400">
          Overlay a colored shape on the tray icon while this association is
          active.
        </div>
      )}
    </Field>
  );
}

function ShapeGlyph({ shape }: { shape: "Circle" | "Square" | "Triangle" }) {
  const style: React.CSSProperties = (() => {
    switch (shape) {
      case "Circle":
        return { borderRadius: "50%" };
      case "Square":
        return {};
      case "Triangle":
        return { clipPath: "polygon(50% 0, 0 100%, 100% 100%)" };
    }
  })();
  return (
    <span
      className="inline-block size-3 bg-current align-middle"
      style={style}
    />
  );
}

function parseGuid(input: string): string | undefined {
  const stripped = input.replace(/[{}\-\s]/g, "");
  if (stripped.length !== 32 || !/^[0-9a-fA-F]{32}$/.test(stripped)) {
    return undefined;
  }
  const s = stripped.toLowerCase();
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const parseVirtualKeyId = (
  toParse: string,
  current: number,
  max: number,
): number => {
  const parsed = parseInt(toParse);
  if (isNaN(parsed)) {
    return current;
  }
  // Input is 1-indexed (VK1, VK2, ...), convert to 0-indexed internal value
  const clamped = Math.max(1, Math.min(parsed, max));
  return clamped - 1;
};

function InputDevicesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [devices, setDevices] = useState<InputDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const abortController = new AbortController();

    setLoading(true);
    setError(null);

    getInputDevices(abortController.signal)
      .then((devices) => {
        setDevices(devices);
        setLoading(false);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load devices");
        setLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [open]);

  return (
    <Dialog className="w-[50rem]" open={open} onClose={onClose}>
      <DialogHeader>
        <DialogHeaderTitle>Attached Input Devices</DialogHeaderTitle>
        <DialogHeaderDescription>
          Input devices currently connected to this machine
        </DialogHeaderDescription>
      </DialogHeader>
      <DialogDivider />
      <DialogBody scrollable className="max-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LargeLoadingIndicator />
          </div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : devices.length === 0 ? (
          <div className="text-stone-400 italic">No input devices found</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-600 text-stone-400">
                <th className="px-2 py-1">VID</th>
                <th className="px-2 py-1">PID</th>
                <th className="px-2 py-1">Serial</th>
                <th className="px-2 py-1">Description</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device, i) => (
                <tr key={i} className="border-b border-stone-700">
                  <td className="px-2 py-1.5 font-mono">
                    {device.vid || <span className="text-stone-500">-</span>}
                  </td>
                  <td className="px-2 py-1.5 font-mono">
                    {device.pid || <span className="text-stone-500">-</span>}
                  </td>
                  <td className="max-w-32 truncate px-2 py-1.5 font-mono">
                    {device.serial || <span className="text-stone-500">-</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    {device.description || (
                      <span className="text-stone-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogBody>
      <DialogFooter className="justify-end">
        <DialogCancelButton onClick={onClose}>Close</DialogCancelButton>
      </DialogFooter>
    </Dialog>
  );
}
