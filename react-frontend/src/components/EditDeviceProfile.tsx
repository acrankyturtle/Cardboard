import clsx from "clsx";
import { Button } from "./Button.tsx";
import { ListBox, ListBoxItem } from "./ListBox.tsx";
import { ReactNode, useMemo, useState } from "react";
import { useDeviceDetails, useDeviceProfile } from "../api/devices.ts";
import { KeyRenderer } from "./KeyRenderer.tsx";
import { Description, Field, Fieldset, Label } from "@headlessui/react";
import { Select, Select, SelectOption } from "./SelectBox.tsx";
import {
  CardboardDialog,
  DialogBody,
  DialogCancelButton,
  DialogConfirmButton,
  DialogDivider,
  DialogFooter,
  DialogFooterButtons,
  DialogHeader,
  DialogHeaderDescription,
  DialogHeaderTitle,
} from "./Dialog.tsx";

export function EditDeviceProfile({
  className,
  deviceId,
  goToDevices,
}: {
  className?: string;
  deviceId: string;
  goToDevices: () => void;
}) {
  const [selectedKeyItem, setSelectedKeyItem] = useState<ListBoxItem | null>(
    null,
  );
  const [selectedLayerItem, setSelectedLayerItem] =
    useState<ListBoxItem | null>(null);

  const [selectedMacroItem, setSelectedMacroItem] =
    useState<ListBoxItem | null>(null);

  const {
    device: deviceDetails,
    isLoading,
    error,
  } = useDeviceDetails(deviceId);

  const { deviceProfile } = useDeviceProfile(deviceId);

  const { keyList, keyItemList } = useMemo(() => {
    const keyList = deviceDetails?.keyMap ?? [];
    const keyItemList = keyList.map((k): ListBoxItem => {
      return {
        label: k.name,
        value: k.keyId,
      };
    });
    return {
      keyList: keyList,
      keyItemList: keyItemList,
    };
  }, [deviceDetails]);

  const selectedKey = useMemo(
    () => deviceProfile?.keys.find((k) => k.id === selectedKeyItem?.value),
    [deviceProfile, selectedKeyItem],
  );

  const defaultLayerItem = { label: "Default Layer", value: "" };

  const layerList = useMemo(() => {
    return selectedKeyItem
      ? [
          ...(selectedKey?.layers ?? []).map((l) => {
            return {
              label: l.tags?.join(", "),
              value: l.layer.id,
            };
          }),
          defaultLayerItem,
        ]
      : [];
  }, [selectedKeyItem]);

  const macroList = useMemo(
    () =>
      deviceProfile.macros.map((m) => {
        return {
          label: m.name,
          value: m.id,
        };
      }),
    [deviceProfile],
  );

  const [editLayer, setEditLayer] = useState<"" | string | null>(null);
  const layerToEdit = useMemo(
    () =>
      editLayer !== null
        ? editLayer === ""
          ? selectedKey?.defaultLayer
          : (selectedKey?.layers?.find((t) => t.layer.id === editLayer) ?? null)
        : null,
    [editLayer, selectedKey],
  );

  return (
    <div className={clsx("flex h-full divide-x-3 divide-stone-950", className)}>
      <div className="grid w-80 grid-rows-2 divide-y-2 divide-stone-950 bg-stone-800">
        <KeysPanel
          className="grow"
          keys={keyItemList}
          selected={selectedKeyItem}
          setSelected={(k) => {
            setSelectedKeyItem(k);
            setSelectedLayerItem(defaultLayerItem);
          }}
        />
        <LayersPanel
          layers={layerList}
          selected={selectedLayerItem}
          setSelected={setSelectedLayerItem}
          onEdit={(layer) => setEditLayer(layer.value)}
        />
      </div>
      <MacrosPanel
        className="w-96"
        macros={macroList}
        selected={selectedMacroItem}
        setSelected={setSelectedMacroItem}
      />
      <KeyRenderer className="p-1" keys={keyList} keyClassName={"bg-red-300"} />
      <div className="fixed right-0 bottom-0 flex gap-2 p-3">
        <Button
          className="min-w-18 px-3"
          buttonStyle={{
            variant: "panelGhost",
          }}
          onClick={goToDevices}
        >
          Cancel
        </Button>
        <Button
          className="min-w-24 px-3"
          buttonStyle={{
            variant: "submit",
          }}
        >
          Save
        </Button>
      </div>
      <CardboardDialog
        open={layerToEdit !== null}
        onClose={() => setEditLayer(null)}
        closeOnBackdropClick={false}
      >
        <DialogHeader>
          <DialogHeaderTitle className="text-lg font-bold">
            Edit Layer
          </DialogHeaderTitle>
          <DialogHeaderDescription className="text-stone-400 italic">{`${selectedLayerItem?.label} @ ${selectedKeyItem?.label}`}</DialogHeaderDescription>
        </DialogHeader>
        <DialogDivider />
        <DialogBody>
          <Fieldset className="w-96 space-y-8">
            <Field className="flex flex-col gap-1">
              <Label>Macro</Label>
              <Select autoFocus>
                <SelectOption>Test Macro 1</SelectOption>
                <SelectOption>Test Macro 2</SelectOption>
                <SelectOption>Test Macro 3</SelectOption>
              </Select>
            </Field>
          </Fieldset>
        </DialogBody>
        <DialogFooter>
          <DialogFooterButtons>
            <DialogCancelButton onClick={() => setEditLayer(null)}>
              Cancel
            </DialogCancelButton>
            <DialogConfirmButton>Save</DialogConfirmButton>
          </DialogFooterButtons>
        </DialogFooter>
      </CardboardDialog>
      {/* <Dialog open={layerToEdit !== null} onClose={() => setEditLayer(null)}>
        <DialogBackdrop
          className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          onClick={() => setEditLayer(null)}
        />
        <div className="fixed inset-0 flex w-screen items-center justify-center">
          <DialogPanel className="flex max-w-lg flex-col gap-y-4 rounded-2xl border-2 border-stone-950 bg-stone-700 p-4 text-stone-100">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-lg font-bold">
                Edit Layer
              </DialogTitle>
              <Description className="text-stone-400 italic">{`${selectedLayerItem?.label} @ ${selectedKeyItem?.label}`}</Description>
            </div>
            <div className="w-full border-b border-stone-800"></div>
            <Fieldset className="w-96 space-y-8">
              <Field className="flex flex-col gap-1">
                <Label>Macro</Label>
                <SelectBox>
                  <SelectOption>Test Macro 1</SelectOption>
                  <SelectOption>Test Macro 2</SelectOption>
                  <SelectOption>Test Macro 3</SelectOption>
                </SelectBox>
              </Field>
            </Fieldset>
            <div className="flex gap-4 pt-6">
              <div className="grow" />
              <Button
                className="px-3"
                buttonStyle={{ variant: "panelGhost" }}
                onClick={() => setEditLayer(null)}
              >
                Cancel
              </Button>
              <Button className="min-w-22" buttonStyle={{ variant: "submit" }}>
                Save
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog> */}
    </div>
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
        "sticky top-0 flex h-9 shrink-0 items-center gap-1 bg-stone-700 p-1 text-lg tracking-widest",
        className,
      )}
    >
      {children}
    </div>
  );
}

const headerBarIconClass = "size-6 text-stone-100";

function KeysPanel({
  className,
  keys,
  selected,
  setSelected,
}: {
  className?: string;
  keys: ListBoxItem[];
  selected: ListBoxItem | null;
  setSelected: (item: ListBoxItem) => void;
}) {
  return (
    <div className={clsx("flex flex-col overflow-y-auto", className)}>
      <HeaderBar className="sticky top-0">
        <div className={headerBarIconClass}>
          <KeysIcon />
        </div>
        <div className="grow">Keys</div>
      </HeaderBar>
      <ListBox
        className="grow"
        variant={"green"}
        items={keys}
        selected={selected}
        setSelected={setSelected}
      />
    </div>
  );
}

function LayersPanel({
  className,
  layers,
  selected,
  setSelected,
  onEdit,
}: {
  className?: string;
  layers: readonly ListBoxItem[];
  selected: ListBoxItem | null;
  setSelected: (item: ListBoxItem) => void;
  onEdit?: (item: ListBoxItem) => void;
}) {
  return (
    <div className={clsx("flex grow flex-col overflow-y-auto", className)}>
      <HeaderBar>
        <div className={headerBarIconClass}>
          <LayersIcon />
        </div>
        <div className="grow">Layers</div>
        <Button
          className={headerBarIconClass}
          buttonStyle={{ variant: "toolbar" }}
        >
          <AddIcon />
        </Button>
        <Button
          className={headerBarIconClass}
          buttonStyle={{ variant: "toolbar" }}
        >
          <RemoveIcon />
        </Button>
        <Button
          className={headerBarIconClass}
          buttonStyle={{ variant: "toolbar" }}
        >
          <MoveUpIcon />
        </Button>
        <Button
          className={headerBarIconClass}
          buttonStyle={{ variant: "toolbar" }}
        >
          <MoveDownIcon />
        </Button>
      </HeaderBar>
      <ListBox
        variant={"red"}
        items={layers}
        selected={selected}
        setSelected={setSelected}
        onEdit={onEdit}
      />
    </div>
  );
}

function MacrosPanel({
  className,
  macros: keys,
  selected,
  setSelected,
}: {
  className?: string;
  macros: ListBoxItem[];
  selected: ListBoxItem | null;
  setSelected: (item: ListBoxItem) => void;
}) {
  return (
    <div className={clsx("bg-stone-800", className)}>
      <HeaderBar>
        <div className="size-5">
          <MacroIcon />
        </div>
        <div className="grow">Macros</div>
        <Button
          className={headerBarIconClass}
          buttonStyle={{ variant: "toolbar" }}
        >
          <AddIcon />
        </Button>
        <Button
          className={headerBarIconClass}
          buttonStyle={{ variant: "toolbar" }}
        >
          <RemoveIcon />
        </Button>
      </HeaderBar>
      <ListBox
        className="grow"
        variant={"blue"}
        items={keys}
        selected={selected}
        setSelected={setSelected}
      />
    </div>
  );
}

function KeysIcon() {
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
      <path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z" />
      <path d="M6 10l0 .01" />
      <path d="M10 10l0 .01" />
      <path d="M14 10l0 .01" />
      <path d="M18 10l0 .01" />
      <path d="M6 14l0 .01" />
      <path d="M18 14l0 .01" />
      <path d="M10 14l4 .01" />
    </svg>
  );
}

function MacroIcon() {
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
      <path d="M17 20h-11a3 3 0 0 1 0 -6h11a3 3 0 0 0 0 6h1a3 3 0 0 0 3 -3v-11a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v8" />
    </svg>
  );
}

function AddIcon() {
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
      <path d="M5 12l14 0" />
    </svg>
  );
}

function RemoveIcon() {
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
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
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
