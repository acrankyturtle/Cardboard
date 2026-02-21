import { Field, Fieldset, Label } from "@headlessui/react";
import { TaggedDeviceLayer } from "../api/devices.ts";
import {
  findTaggedLayerById,
  getTaggedLayerName,
  newTaggedLayer,
  useEditDeviceContext,
} from "../lib/editDeviceContext.tsx";
import { addLayerWithTags, editTaggedLayer } from "../lib/profileActions.ts";
import { useCallback, useEffect, useState } from "react";
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
import { TagListEditor } from "./TagListEditor.tsx";

type DialogMode =
  | { type: "edit"; keyId: string; layerId: string }
  | { type: "add"; keyId: string; aboveLayerId: string | null };

export function EditTaggedLayerDialog() {
  const { state, dispatch } = useEditDeviceContext();
  const [layerToEdit, setLayerToEdit] = useState<TaggedDeviceLayer>();
  const [mode, setMode] = useState<DialogMode>();

  const showModal =
    state.modal !== null &&
    (state.modal.type === "editTaggedLayer" ||
      state.modal.type === "addTaggedLayer") &&
    state.modal.show;

  useEffect(() => {
    if (
      !state.modal ||
      (state.modal.type !== "editTaggedLayer" &&
        state.modal.type !== "addTaggedLayer") ||
      !state.modal.show
    ) {
      setMode(undefined);
      setLayerToEdit(undefined);
      return;
    }

    if (state.modal.type === "editTaggedLayer") {
      if (
        mode &&
        mode.type === "edit" &&
        state.modal.keyId === mode.keyId &&
        state.modal.layerId === mode.layerId
      )
        return;

      const layer = findTaggedLayerById(
        state.modal.keyId,
        state.modal.layerId,
        state,
      );
      if (!layer) return;

      setLayerToEdit(layer);
      setMode({
        type: "edit",
        keyId: state.modal.keyId,
        layerId: state.modal.layerId,
      });
    } else if (state.modal.type === "addTaggedLayer") {
      if (
        mode &&
        mode.type === "add" &&
        state.modal.keyId === mode.keyId &&
        state.modal.aboveLayerId === mode.aboveLayerId
      )
        return;

      setLayerToEdit(newTaggedLayer());
      setMode({
        type: "add",
        keyId: state.modal.keyId,
        aboveLayerId: state.modal.aboveLayerId,
      });
    }
  }, [state.modal]);

  const closeModal = useCallback(
    () => dispatch({ type: "setModal", modal: null }),
    [dispatch],
  );

  const handleConfirm = useCallback(() => {
    if (!showModal || !layerToEdit || !mode) return;

    if (mode.type === "edit") {
      dispatch(
        editTaggedLayer(
          mode.keyId,
          mode.layerId,
          layerToEdit,
          state.profile,
        ),
      );
    } else {
      const { action, newLayerId } = addLayerWithTags(
        mode.keyId,
        mode.aboveLayerId,
        layerToEdit,
        state.profile,
      );
      dispatch(action);
      dispatch({
        type: "setSelectedLayer",
        layerId: newLayerId,
      });
    }

    dispatch({ type: "setModal", modal: null });
  }, [showModal, layerToEdit, mode, dispatch, state.profile]);

  if (!mode) return <></>;

  const keyInfo =
    state.device.keyMap.find((k) => k.keyId === mode.keyId) ?? null;

  const isAddMode = mode.type === "add";
  const title = isAddMode ? "Add Layer" : "Edit Layer";

  return (
    <Dialog className="max-w-lg" open={showModal} onClose={closeModal}>
      <DialogHeader>
        <DialogHeaderTitle className="text-lg font-bold">
          {title}
        </DialogHeaderTitle>
        {layerToEdit && keyInfo && !isAddMode && (
          <DialogHeaderDescription>
            `${getTaggedLayerName(layerToEdit)} @ ${keyInfo.name}`
          </DialogHeaderDescription>
        )}
        {keyInfo && isAddMode && (
          <DialogHeaderDescription>{keyInfo.name}</DialogHeaderDescription>
        )}
      </DialogHeader>
      <DialogDivider />
      <DialogBody>
        <Fieldset className="w-96 space-y-8">
          <Field className="flex flex-col gap-1">
            <Label>Tags</Label>
            <TagListEditor
              autoFocus
              value={layerToEdit?.tags ?? []}
              onChange={(v) => {
                if (layerToEdit) setLayerToEdit({ ...layerToEdit, tags: v });
              }}
            />
          </Field>
        </Fieldset>
      </DialogBody>
      <DialogFooter>
        <div className="grow" />
        <DialogConfirmButton onClick={handleConfirm}>
          Confirm
        </DialogConfirmButton>
        <DialogCancelButton onClick={closeModal}>Cancel</DialogCancelButton>
      </DialogFooter>
    </Dialog>
  );
}
