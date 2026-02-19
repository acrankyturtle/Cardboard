import { Field, Fieldset, Label } from "@headlessui/react";
import { TaggedDeviceLayer } from "../api/devices.ts";
import {
  findTaggedLayerById,
  getTaggedLayerName,
  updateTaggedLayer,
  useEditDeviceContext,
} from "../lib/editDeviceContext.tsx";
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

export function EditTaggedLayerDialog() {
  const { state, dispatch } = useEditDeviceContext();
  const [layerToEdit, setLayerToEdit] = useState<TaggedDeviceLayer>();

  const [info, setInfo] = useState<
    { keyId: string; layerId: string } | undefined
  >(undefined);

  const showModal =
    state.modal !== null &&
    state.modal.type === "editTaggedLayer" &&
    state.modal.show;

  useEffect(() => {
    if (
      !state.modal ||
      state.modal.type !== "editTaggedLayer" ||
      !state.modal.show
    ) {
      setInfo(undefined);
      setLayerToEdit(undefined);
      return;
    }

    if (
      info &&
      state.modal.keyId === info.keyId &&
      state.modal.layerId === info.layerId
    )
      return;

    const layer = findTaggedLayerById(
      state.modal.keyId,
      state.modal.layerId,
      state,
    );
    if (!layer) return;

    setLayerToEdit(layer);
    setInfo({ keyId: state.modal.keyId, layerId: state.modal.layerId });
  }, [state.modal]);

  const closeModal = useCallback(
    () => dispatch({ type: "setModal", modal: null }),
    [dispatch],
  );

  if (!info) return <></>;

  const keyInfo =
    state.device.keyMap.find((k) => k.keyId === info.keyId) ?? null;

  return (
    <Dialog className="max-w-lg" open={showModal} onClose={closeModal}>
      <DialogHeader>
        <DialogHeaderTitle className="text-lg font-bold">
          Edit Layer
        </DialogHeaderTitle>
        {layerToEdit && keyInfo && (
          <DialogHeaderDescription>
            `${getTaggedLayerName(layerToEdit)} @ ${keyInfo.name}`
          </DialogHeaderDescription>
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
        <DialogConfirmButton
          onClick={() => {
            if (!showModal || !layerToEdit) return;

            const updated = updateTaggedLayer(
              info.keyId,
              info.layerId,
              state.profile,
              layerToEdit,
            );
            dispatch({
              type: "setProfile",
              profile: updated,
              description: "Edit layer",
            });
            dispatch({
              type: "setModal",
              modal: null,
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
