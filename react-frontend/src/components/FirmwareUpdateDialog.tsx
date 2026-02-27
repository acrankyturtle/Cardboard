import { UPDATE_STAGES_IN_ORDER } from "../types/firmwareUpdate";
import { FirmwareUpdateState } from "../types/firmwareUpdate";
import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderTitle,
} from "./Dialog";
import { HelpLink } from "./HelpLink.tsx";
import {
  useAutoDismiss,
  FirmwareUpdateProgressSteps,
  FirmwareUpdateSuccess,
  FirmwareUpdateError,
} from "./firmwareUpdateShared";

interface FirmwareUpdateDialogProps {
  open: boolean;
  state: FirmwareUpdateState;
  onClose: () => void;
}

export function FirmwareUpdateDialog({
  open,
  state,
  onClose,
}: FirmwareUpdateDialogProps) {
  const isSuccess = state.stage === "success";
  const isError = state.stage === "error";
  const isComplete = isSuccess || isError;

  useAutoDismiss(isSuccess, onClose);

  return (
    <Dialog open={open} closeOnBackdropClick={false}>
      <DialogHeader>
        <DialogHeaderTitle className="flex items-center gap-2">
          {isSuccess
            ? "Update Complete"
            : isError
              ? "Update Failed"
              : "Updating Firmware"}
          <HelpLink section="firmware-updates" />
        </DialogHeaderTitle>
      </DialogHeader>
      <DialogDivider />
      <DialogBody className="w-[24rem]">
        {isSuccess ? (
          <FirmwareUpdateSuccess />
        ) : isError ? (
          <FirmwareUpdateError error={state.error} />
        ) : (
          <FirmwareUpdateProgressSteps
            stage={state.stage}
            stages={UPDATE_STAGES_IN_ORDER}
          />
        )}
      </DialogBody>
      {isComplete && (
        <DialogFooter className="justify-end">
          <DialogCancelButton onClick={onClose}>
            {isSuccess ? "Done" : "Close"}
          </DialogCancelButton>
        </DialogFooter>
      )}
    </Dialog>
  );
}
