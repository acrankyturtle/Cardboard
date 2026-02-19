import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Header from "../components/Header.tsx";
import clsx from "clsx";
import { Button, getButtonClassName } from "../components/Button.tsx";
import {
  Association,
  AssociationData,
  createAssociation,
  createEmptyAssociationData,
  createEmptyVirtualKeyAssociation,
  deleteAssociation,
  EMPTY_INPUT_KEY,
  getInputKeyLabel,
  updateAssociation,
  useAssociations,
  VirtualKeyAssociation,
} from "../api/associations.ts";
import { useDeviceList } from "../api/devices.ts";
import {
  DelayedLoadingIndicator,
  LargeLoadingIndicator,
} from "../components/LoadingIndicator.tsx";
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
} from "../components/Dialog.tsx";
import { Field, Fieldset, Input, Label, Textarea } from "@headlessui/react";
import { InputKeySelector } from "../components/InputKeySelector.tsx";
import { InputClassName } from "../components/Input.tsx";
import { ComboInput, ComboInputItem } from "../components/ComboInput.tsx";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  RemoveIcon,
  ThickExportIcon,
  ThickImportIcon,
} from "../assets/sharedIcons.tsx";
import { Tooltip } from "../components/Tooltip.tsx";
import { HelpLink } from "../components/HelpLink.tsx";
import { getInputDevices, InputDeviceInfo } from "../api/inputDevices.ts";
import { downloadJsonFile, pickAndReadJsonFile } from "../lib/jsonFileUtils.ts";

export function AssociationsIndex() {
  const { associations, isLoading, error, mutate } = useAssociations();
  const [editingAssociation, setEditingAssociation] = useState<{
    id: string | null;
    data: AssociationData;
  } | null>(null);
  const [deletingAssociation, setDeletingAssociation] =
    useState<Association | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = useCallback(() => {
    downloadJsonFile(
      { associations: associations.map((a) => a.data) },
      "associations.json",
    );
  }, [associations]);

  const handleImport = useCallback(async () => {
    const file = await pickAndReadJsonFile<{
      associations: AssociationData[];
    }>();
    if (!file) return;

    if (
      !file.associations ||
      !Array.isArray(file.associations) ||
      !file.associations.every(
        (a) =>
          Array.isArray(a.tags) &&
          Array.isArray(a.virtualKeys) &&
          Array.isArray(a.matchOnPath),
      )
    ) {
      setImportError(
        "Invalid file: expected { associations: [{ tags, virtualKeys, matchOnPath }] }",
      );
      return;
    }

    setImportError(null);
    setImporting(true);
    let errorCount = 0;

    for (const data of file.associations) {
      const result = await createAssociation(data);
      if ("error" in result) {
        errorCount++;
      }
    }

    setImporting(false);
    mutate();

    if (errorCount > 0) {
      setImportError(
        `Failed to import ${errorCount} of ${file.associations.length} associations`,
      );
    }
  }, [mutate]);

  const handleAdd = () => {
    setSaveError(null);
    setEditingAssociation({
      id: null,
      data: createEmptyAssociationData(),
    });
  };

  const handleEdit = (association: Association) => {
    setSaveError(null);
    setEditingAssociation({
      id: association.id,
      data: { ...association.data },
    });
  };

  const handleSave = async (data: AssociationData) => {
    if (!editingAssociation) return;

    setSaveError(null);
    let result: "success" | { error: string };

    if (editingAssociation.id) {
      result = await updateAssociation(editingAssociation.id, data);
    } else {
      const createResult = await createAssociation(data);
      result = "error" in createResult ? createResult : "success";
    }

    if (result === "success") {
      setEditingAssociation(null);
      mutate();
    } else {
      setSaveError(result.error);
    }
  };

  const handleDelete = async () => {
    if (!deletingAssociation) return;

    setDeleteError(null);
    const result = await deleteAssociation(deletingAssociation.id);

    if (result === "success") {
      setDeletingAssociation(null);
      mutate();
    } else {
      setDeleteError(result.error);
    }
  };

  return (
    <div className="flex size-full flex-col">
      <AssociationsHeader>
        <div className="grow">Associations</div>
        {importError && (
          <div className="text-lg text-red-500">{importError}</div>
        )}
        <Button
          className="gap-1 px-4"
          buttonStyle={{ variant: "ghost" }}
          onClick={handleImport}
          disabled={importing}
        >
          <div className="-my-2 -ml-1 size-5">
            <ThickImportIcon />
          </div>
          <div>{importing ? "Importing..." : "Import"}</div>
        </Button>
        <Button
          className="gap-1 px-4"
          buttonStyle={{ variant: "ghost" }}
          onClick={handleExport}
          disabled={associations.length === 0}
        >
          <div className="-my-2 -ml-1 size-5">
            <ThickExportIcon />
          </div>
          <div>Export</div>
        </Button>
        <Button className="gap-1 px-4" onClick={handleAdd}>
          <div className="-my-2 -ml-2 size-7">
            <AddIcon />
          </div>
          <div>Add</div>
        </Button>
        <HelpLink section="associations" size="medium" />
      </AssociationsHeader>
      <div className="grow overflow-y-auto p-4">
        {isLoading ? (
          <DelayedLoadingIndicator
            delayMs={250}
            renderLoading={() => <LargeLoadingIndicator className="m-2" />}
            renderWait={() => <></>}
          />
        ) : error ? (
          <div className="flex gap-1">
            <div className="text-red-500">Error loading associations:</div>
            <div className="whitespace-pre-wrap text-red-500">
              {error.message}
            </div>
          </div>
        ) : associations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 pt-8 text-stone-400">
            <div>No associations configured</div>
            <Button onClick={handleAdd}>Add Association</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {associations.map((association) => (
              <AssociationCard
                key={association.id}
                association={association}
                onEdit={() => handleEdit(association)}
                onDelete={() => setDeletingAssociation(association)}
              />
            ))}
          </div>
        )}
      </div>

      <EditAssociationDialog
        open={editingAssociation !== null}
        isNew={editingAssociation?.id === null}
        data={editingAssociation?.data ?? createEmptyAssociationData()}
        setData={(data) =>
          setEditingAssociation((prev) => (prev ? { ...prev, data } : null))
        }
        onClose={() => setEditingAssociation(null)}
        onSave={handleSave}
        error={saveError}
      />

      <DeleteConfirmDialog
        open={deletingAssociation !== null}
        association={deletingAssociation}
        onClose={() => setDeletingAssociation(null)}
        onConfirm={handleDelete}
        error={deleteError}
      />
    </div>
  );
}

function AssociationsHeader({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Header
      className={clsx("sticky top-0 flex gap-2 justify-self-start", className)}
    >
      {children}
    </Header>
  );
}

function AssociationCard({
  association,
  onEdit,
  onDelete,
}: {
  association: Association;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-stone-700 bg-stone-800 p-4 shadow">
      <AssociationDetails className="grow" association={association} />
      <div className="flex gap-2">
        <Tooltip content="Edit">
          <button
            className={clsx(
              getButtonClassName({ variant: "ghost", padding: "none" }),
            )}
            onClick={onEdit}
          >
            <div className="size-8 p-1.5">
              <EditIcon />
            </div>
          </button>
        </Tooltip>
        <Tooltip content="Delete">
          <button
            className={clsx(
              getButtonClassName({ variant: "ghost", padding: "none" }),
              "text-red-400 hover:text-red-300",
            )}
            onClick={onDelete}
          >
            <div className="size-8 p-1.5">
              <DeleteIcon />
            </div>
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function EditAssociationDialog({
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
      name: d.name,
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

  // Local state for input fields to allow typing without immediate filtering
  const [tagsInput, setTagsInput] = useState(() => data.tags.join(", "));
  const [pathsInput, setPathsInput] = useState(() =>
    data.matchOnPath.join("\n"),
  );

  // Sync local state when data changes (e.g., when dialog opens with new data)
  useEffect(() => {
    setTagsInput(data.tags.join(", "));
  }, [data.tags]);

  useEffect(() => {
    setPathsInput(data.matchOnPath.join("\n"));
  }, [data.matchOnPath]);

  const handleTagsBlur = useCallback(() => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setData({ ...data, tags });
  }, [data, setData, tagsInput]);

  const handlePathsBlur = useCallback(() => {
    const matchOnPath = pathsInput
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    setData({ ...data, matchOnPath });
  }, [data, setData, pathsInput]);

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
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const matchOnPath = pathsInput
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const virtualKeys = data.virtualKeys.filter((v) => {
      return v.deviceMatching.inputKey !== EMPTY_INPUT_KEY;
    });
    onSave({ ...data, tags, matchOnPath, virtualKeys });
  }, [data, tagsInput, pathsInput, onSave]);

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
      <DialogBody className="max-h-[60vh] overflow-y-auto">
        <Fieldset className="space-y-4">
          <Field className="flex flex-col gap-1">
            <Label className="text-sm font-medium">Match Paths</Label>
            <Textarea
              className={clsx("h-24 w-full resize-none", InputClassName)}
              placeholder="notepad.exe&#10;C:\Program Files\MyApp"
              value={pathsInput}
              onChange={(e) => setPathsInput(e.target.value)}
              onBlur={handlePathsBlur}
            />
            <div className="text-xs text-stone-400">
              One path per line. Tags apply when focused window path contains
              any of these strings.
            </div>
          </Field>
          <DialogDivider />
          <Field className="flex flex-col gap-1">
            <Label className="text-sm font-medium">Tags</Label>
            <Input
              className={clsx("w-full", InputClassName)}
              type="text"
              placeholder="tag1, tag2, tag3"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={handleTagsBlur}
            />
            <div className="text-xs text-stone-400">
              Comma-separated list of tags to apply
            </div>
          </Field>
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
              <button
                type="button"
                className="text-cyan-400 underline hover:text-cyan-300"
                onClick={() => setShowInputDevices(true)}
              >
                View attached input devices
              </button>
            </div>
          </div>
        </Fieldset>
      </DialogBody>
      <InputDevicesDialog
        open={showInputDevices}
        onClose={() => setShowInputDevices(false)}
      />
      <DialogFooter className="justify-end">
        {error && <div className="mr-auto text-red-400">{error}</div>}
        <DialogCancelButton onClick={onClose}>Cancel</DialogCancelButton>
        <DialogConfirmButton onClick={handleSaveWithProcess}>
          {isNew ? "Create" : "Save"}
        </DialogConfirmButton>
      </DialogFooter>
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
        <button
          className={clsx(
            getButtonClassName({ variant: "ghost", padding: "none" }),
            "size-6 self-center p-1 text-red-400 hover:text-red-300",
          )}
          onClick={onRemove}
        >
          <RemoveIcon />
        </button>
      </Tooltip>
    </div>
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
      <DialogBody className="max-h-[60vh] overflow-y-auto">
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

function DeleteConfirmDialog({
  open,
  association,
  onClose,
  onConfirm,
  error,
}: {
  open: boolean;
  association: Association | null;
  onClose: () => void;
  onConfirm: () => void;
  error: string | null;
}) {
  return (
    <Dialog className="w-96" open={open} onClose={onClose}>
      <DialogHeader>
        <DialogHeaderTitle>Delete Association</DialogHeaderTitle>
      </DialogHeader>
      <DialogDivider />
      <DialogBody>
        <p>Are you sure you want to delete this association?</p>
        {association && (
          <AssociationDetails
            className="overflow-x-auto rounded-lg border border-stone-900 bg-stone-800 p-2"
            association={association}
          />
        )}
        <p className="text-sm text-stone-400">This action cannot be undone.</p>
      </DialogBody>
      <DialogFooter className="justify-end">
        {error && <div className="mr-auto text-red-400">{error}</div>}
        <DialogCancelButton onClick={onClose}>Cancel</DialogCancelButton>
        <Button
          className="min-w-24"
          buttonStyle={{ variant: "danger" }}
          onClick={onConfirm}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function AssociationDetails({
  className,
  association,
}: {
  className?: string;
  association: Association;
}) {
  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <ApplicationPathList association={association} />
      <TagsList association={association} />
      <VirtualKeyList association={association} />
    </div>
  );
}

function ApplicationPathList({ association }: { association: Association }) {
  return association.data.matchOnPath.length > 0 ? (
    <ItemsContainer>
      <ItemListHeader>Match Paths</ItemListHeader>
      <ItemListBody>
        {association.data.matchOnPath.map((path, i) => (
          <Item key={i} className="bg-gray-700 text-sm">
            {path}
          </Item>
        ))}
      </ItemListBody>
    </ItemsContainer>
  ) : (
    <div className="text-sm text-stone-500 italic">(No match paths)</div>
  );
}

function TagsList({ association }: { association: Association }) {
  return (
    association.data.tags.length > 0 && (
      <ItemsContainer>
        <ItemListHeader>Tags</ItemListHeader>
        <ItemListBody>
          {association.data.tags.map((tag) => (
            <Item key={tag} className="bg-yellow-800 text-sm">
              {tag}
            </Item>
          ))}
        </ItemListBody>
      </ItemsContainer>
    )
  );
}

function VirtualKeyList({ association }: { association: Association }) {
  return (
    association.data.virtualKeys.length > 0 && (
      <ItemsContainer>
        <ItemListHeader>Virtual Keys</ItemListHeader>
        <ItemListBody>
          {association.data.virtualKeys.map((vk, i) => {
            const { vid, pid, serial, description } = vk.deviceMatching;
            const hasFilters = vid || pid || serial || description;
            return (
              <Item
                key={i}
                className="flex-col items-start bg-cyan-900 text-xs"
              >
                <div>
                  {getInputKeyLabel(vk.deviceMatching.inputKey)} → VK
                  {vk.virtualKey + 1}
                </div>
                {hasFilters && (
                  <div className="text-cyan-300">
                    {[
                      vid && `VID:${vid}`,
                      pid && `PID:${pid}`,
                      serial && `S/N:${serial}`,
                      description && `DESC:"${description}"`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </div>
                )}
              </Item>
            );
          })}
        </ItemListBody>
      </ItemsContainer>
    )
  );
}

function ItemsContainer({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>{children}</div>
  );
}

function ItemListHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="text-xs font-medium text-stone-400 uppercase">
      {children}
    </div>
  );
}

function ItemListBody({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={clsx("ml-3 flex flex-wrap items-start gap-1", className)}>
      {children}
    </div>
  );
}

function Item({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx("rounded px-2 py-0.5 font-mono text-nowrap", className)}
    >
      {children}
    </div>
  );
}
