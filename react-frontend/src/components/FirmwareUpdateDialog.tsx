import clsx from "clsx";
import { useEffect } from "react";
import {
  FirmwareUpdateState,
  FirmwareUpdateStage,
  STAGE_LABELS,
  UPDATE_STAGES_IN_ORDER,
} from "../types/firmwareUpdate";
import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderTitle,
} from "./Dialog";
import { LoadingIndicator } from "./LoadingIndicator";
import { HelpLink } from "./HelpLink.tsx";
import {
  CheckIcon,
  RemoveIcon,
} from "@root/react-frontend/src/assets/sharedIcons.tsx";

interface FirmwareUpdateDialogProps {
  open: boolean;
  state: FirmwareUpdateState;
  onClose: () => void;
}

const AUTO_DISMISS_DELAY_MS = 5000;

export function FirmwareUpdateDialog({
  open,
  state,
  onClose,
}: FirmwareUpdateDialogProps) {
  const isSuccess = state.stage === "success";
  const isError = state.stage === "error";
  const isComplete = isSuccess || isError;

  // Auto-dismiss on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, AUTO_DISMISS_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

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
          <SuccessContent />
        ) : isError ? (
          <ErrorContent error={state.error} />
        ) : (
          <ProgressContent stage={state.stage} />
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

function ProgressContent({ stage }: { stage: FirmwareUpdateStage }) {
  const currentIndex = UPDATE_STAGES_IN_ORDER.indexOf(stage);

  return (
    <div className="flex flex-col gap-3 py-2">
      {UPDATE_STAGES_IN_ORDER.map((s, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = s === stage;
        const isPending = index > currentIndex;

        return (
          <div key={s} className="flex items-center gap-3">
            <div className="flex w-6 items-center justify-center">
              {isComplete ? (
                <CheckIcon className="size-5 text-lime-400" />
              ) : isCurrent ? (
                <LoadingIndicator className="size-5 text-stone-200" />
              ) : (
                <div className="size-2 rounded-full bg-stone-600" />
              )}
            </div>
            <span
              className={clsx("text-sm", {
                "text-lime-400": isComplete,
                "font-medium text-stone-200": isCurrent,
                "text-stone-500": isPending,
              })}
            >
              {STAGE_LABELS[s]}
            </span>
          </div>
        );
      })}
      <div className="mt-2 text-center text-xs text-stone-500">
        Do not disconnect the device
      </div>
    </div>
  );
}

function SuccessContent() {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-lime-500/20">
        <CheckIcon className="size-10 text-lime-400" />
      </div>
      <div className="text-center">
        <div className="font-medium text-stone-200">
          Firmware updated successfully
        </div>
        <div className="mt-1 text-sm text-stone-400">
          Your device is ready to use
        </div>
      </div>
    </div>
  );
}

function ErrorContent({
  error,
}: {
  error?: { code: string; message: string };
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-500/20">
        <RemoveIcon className="size-10 text-red-400" />
      </div>
      <div className="text-center">
        <div className="font-medium text-stone-200">Update failed</div>
        <div className="mt-1 text-sm text-stone-400">
          {error?.message || "An unknown error occurred"}
        </div>
        {error?.code && (
          <div className="mt-2 font-mono text-xs text-stone-600">
            {error.code}
          </div>
        )}
      </div>
    </div>
  );
}
