import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Link } from "react-router";
import { DeviceProfile, updateDeviceProfile } from "../api/devices.ts";
import { Button, getButtonClassName } from "./Button.tsx";
import { downloadJsonFile, pickAndReadJsonFile } from "../lib/jsonFileUtils.ts";
import {
  Dialog,
  DialogBody,
  DialogDivider,
  DialogHeader,
} from "./Dialog.tsx";
import { LoadingIndicator } from "./LoadingIndicator.tsx";
import {
  isProfileChanged,
  useEditDeviceContext,
} from "../lib/editDeviceContext.tsx";
import {
  importProfile,
  renameProfile,
} from "../lib/profileActions.ts";
import { NavigationBlocker } from "./NavigationBlocker.tsx";
import { EditableProfileName } from "./EditableProfileName.tsx";
import { EditDeviceProfile } from "./EditDeviceProfile.tsx";
import {
  RedoIcon,
  ThickExportIcon,
  ThickImportIcon,
  UndoIcon,
} from "../assets/sharedIcons.tsx";
import { HelpLink } from "./HelpLink.tsx";
import { Tooltip } from "./Tooltip.tsx";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "./ContextMenu.tsx";
import { DevicesHeader } from "../pages/DevicesIndex.tsx";

export function EditDeviceView() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);

  const { state, dispatch } = useEditDeviceContext();

  const handleSave = useCallback(() => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    updateDeviceProfile(state.device.id, state.profile).then((v) => {
      setSaving(false);
      if (v !== "success") {
        setSaveError(v.error);
      } else {
        setSaveSuccess(true);
        dispatch({ type: "cleanChanges" });
        setTimeout(() => setSaveSuccess(false), 5000);
      }
    });
  }, [saving, state.device.id, state.profile]);

  const handleExportProfile = useCallback(() => {
    const filename = `${state.profile.name || state.device.model}.profile.json`;
    downloadJsonFile(state.profile, filename);
  }, [state.profile, state.device.model]);

  const handleImportProfile = useCallback(async () => {
    const data = await pickAndReadJsonFile<DeviceProfile>(".profile.json");
    if (!data) return;

    if (
      typeof data.name !== "string" ||
      !Array.isArray(data.keys) ||
      !Array.isArray(data.virtualKeys) ||
      !Array.isArray(data.macros)
    ) {
      setSaveError(
        "Invalid profile file: missing name, keys, virtualKeys, or macros",
      );
      return;
    }

    setSaveError(null);
    dispatch(importProfile(data));
  }, [dispatch]);

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;
  const undoDescription = canUndo
    ? state.undoStack[state.undoStack.length - 1].description
    : undefined;
  const redoDescription = canRedo
    ? state.redoStack[state.redoStack.length - 1].description
    : undefined;

  // initialize selections
  useEffect(() => {
    const firstKeyId = state.profile.keys[0]?.id;
    if (firstKeyId) {
      dispatch({ type: "setSelectedKey", keyId: firstKeyId });
    }

    const firstMacroId = state.profile.macros[0]?.id;
    if (firstMacroId) {
      dispatch({ type: "setSelectedMacro", macroId: firstMacroId });
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      if (e.ctrlKey && !e.altKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if (
        e.ctrlKey &&
        !e.altKey &&
        (e.key === "Z" || (e.key === "z" && e.shiftKey) || e.key === "y")
      ) {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  const hasChanges = useMemo(
    () => isProfileChanged(state.profile, state.originalProfile),
    [state.profile, state.originalProfile],
  );

  return (
    <>
      <NavigationBlocker
        hasChanges={hasChanges}
        message="You have unsaved profile changes. Are you sure you want to leave?"
      />
      <DevicesHeader>
        <div
          className={clsx("flex min-w-0 grow flex-wrap gap-3", {
            "items-center": isEditingProfileName,
            "items-end": !isEditingProfileName,
          })}
        >
          <div>Edit</div>
          <EditableProfileName
            name={state.profile.name}
            fallback={state.device.model}
            onChange={(newName) =>
              dispatch(renameProfile(newName, state.profile))
            }
            onEditing={(v) => setIsEditingProfileName(v)}
          />
          <div className="overflow-hidden text-lg font-normal text-ellipsis text-stone-400">
            {state.device.id}
          </div>
        </div>
        <div
          className={clsx("p-1 text-lg text-green-500 transition", {
            "opacity-0 duration-[2000ms]": !saveSuccess,
            "opacity-100 duration-[0ms]": saveSuccess,
          })}
        >
          Profile saved successfully
        </div>
        {saveError && <div className="text-lg text-red-500">{saveError}</div>}
        <ContextMenu>
          <ContextMenuTrigger>
            <Tooltip
              content={
                undoDescription
                  ? `Undo: ${undoDescription} (ctrl+z)`
                  : "Nothing to undo"
              }
            >
              <Button
                className="px-2"
                buttonStyle={{ variant: "ghost" }}
                onClick={() => dispatch({ type: "undo" })}
                disabled={!canUndo}
              >
                <UndoIcon className="-m-0.5 size-6" />
              </Button>
            </Tooltip>
          </ContextMenuTrigger>
          <ContextMenuPopup className="max-h-48 overflow-y-auto">
            {state.undoStack.length === 0 ? (
              <ContextMenuItem disabled>No undo history</ContextMenuItem>
            ) : (
              [...state.undoStack]
                .reverse()
                .map((entry, reverseIndex) => {
                  const index =
                    state.undoStack.length - 1 - reverseIndex;
                  return (
                    <ContextMenuItem
                      key={index}
                      onClick={() =>
                        dispatch({ type: "undo", numberOfActions: state.undoStack.length - index })
                      }
                    >
                      {entry.description}
                    </ContextMenuItem>
                  );
                })
            )}
          </ContextMenuPopup>
        </ContextMenu>
        <ContextMenu>
          <ContextMenuTrigger>
            <Tooltip
              content={
                redoDescription
                  ? `Redo: ${redoDescription} (ctrl+shift+z)`
                  : "Nothing to redo"
              }
            >
              <Button
                className="px-2"
                buttonStyle={{ variant: "ghost" }}
                onClick={() => dispatch({ type: "redo" })}
                disabled={!canRedo}
              >
                <RedoIcon className="-m-0.5 size-6" />
              </Button>
            </Tooltip>
          </ContextMenuTrigger>
          <ContextMenuPopup className="max-h-48 overflow-y-auto">
            {state.redoStack.length === 0 ? (
              <ContextMenuItem disabled>No redo history</ContextMenuItem>
            ) : (
              [...state.redoStack]
                .reverse()
                .map((entry, reverseIndex) => {
                  const index =
                    state.redoStack.length - 1 - reverseIndex;
                  return (
                    <ContextMenuItem
                      key={index}
                      onClick={() =>
                        dispatch({ type: "redo", numberOfActions: state.redoStack.length - index })
                      }
                    >
                      {entry.description}
                    </ContextMenuItem>
                  );
                })
            )}
          </ContextMenuPopup>
        </ContextMenu>
        <Button
          className="gap-1 px-4"
          buttonStyle={{ variant: "ghost" }}
          onClick={handleImportProfile}
        >
          <ThickImportIcon className="-my-2 -ml-1 size-5" />
          <div>Import</div>
        </Button>
        <Button
          className="gap-1 px-4"
          buttonStyle={{ variant: "ghost" }}
          onClick={handleExportProfile}
        >
          <ThickExportIcon className="-my-2 -ml-1 size-5" />
          <div>Export</div>
        </Button>
        <Link
          className={clsx("min-w-18 px-3", getButtonClassName({}))}
          to="/devices"
        >
          Cancel
        </Link>
        <Button
          className="min-w-24 px-3"
          buttonStyle={{ variant: "submit" }}
          onClick={handleSave}
        >
          Save
        </Button>
        <HelpLink section="profiles" size="medium" />
      </DevicesHeader>
      <div className="grow overflow-y-hidden border-l-3 border-stone-950">
        <EditDeviceProfile className="h-full" />
      </div>
      <Dialog open={saving}>
        <DialogHeader>Saving...</DialogHeader>
        <DialogDivider />
        <DialogBody className="items-center">
          <div className="mb-2">
            Your profile is currently being transferred to the device.
          </div>
          <div className="mb-6">Please wait...</div>
          <LoadingIndicator className="mb-10 size-24" />
        </DialogBody>
      </Dialog>
    </>
  );
}
