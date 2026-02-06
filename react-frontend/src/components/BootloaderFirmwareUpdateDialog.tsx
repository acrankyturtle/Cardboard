import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useBootloaderFirmwareUpdate } from "../hooks/useBootloaderFirmwareUpdate";
import { FirmwareListEntry, useFirmwareList } from "../api/devices";
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
} from "./Dialog";
import { LoadingIndicator } from "./LoadingIndicator";
import { FirmwareUpdateStage, STAGE_LABELS } from "../types/firmwareUpdate";

interface BootloaderFirmwareUpdateDialogProps {
  open: boolean;
  onClose: () => void;
}

// These are the only stages relevant for bootloader updates
const BOOTLOADER_UPDATE_STAGES: FirmwareUpdateStage[] = [
  "bootloader",
  "flashing",
];

const AUTO_DISMISS_DELAY_MS = 5000;

function getFirmwareKey(entry: FirmwareListEntry): string {
  return `${entry.deviceTypeId}:${entry.variant ?? ""}`;
}

export function BootloaderFirmwareUpdateDialog({
  open,
  onClose,
}: BootloaderFirmwareUpdateDialogProps) {
  const { firmware, isLoading: isFirmwareLoading } = useFirmwareList();

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [showProgress, setShowProgress] = useState(false);

  // Auto-select first firmware when list loads
  useEffect(() => {
    if (firmware.length > 0 && !selectedKey) {
      setSelectedKey(getFirmwareKey(firmware[0]));
    }
  }, [firmware, selectedKey]);

  const selectedFirmware = firmware.find(
    (f) => getFirmwareKey(f) === selectedKey,
  );

  const { state, startUpdate, reset, isUpdating } = useBootloaderFirmwareUpdate(
    {
      deviceType: selectedFirmware?.deviceTypeId ?? "",
      variant: selectedFirmware?.variant,
      onSuccess: () => {},
    },
  );

  const isSuccess = state.stage === "success";
  const isError = state.stage === "error";
  const isComplete = isSuccess || isError;

  const handleClose = useCallback(() => {
    reset();
    setShowProgress(false);
    onClose();
  }, [reset, onClose]);

  // Auto-dismiss on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        handleClose();
      }, AUTO_DISMISS_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, handleClose]);

  const handleStartUpdate = () => {
    setShowProgress(true);
    startUpdate();
  };

  const canFlash = selectedFirmware && !isFirmwareLoading;

  return (
    <Dialog open={open} onClose={() => !isUpdating && handleClose()}>
      <DialogHeader>
        <DialogHeaderTitle>
          {showProgress
            ? isSuccess
              ? "Update Complete"
              : isError
                ? "Update Failed"
                : "Flashing Firmware"
            : "Flash Bootloader Device"}
        </DialogHeaderTitle>
        {!showProgress && (
          <DialogHeaderDescription>
            Flash firmware to a device in bootloader mode
          </DialogHeaderDescription>
        )}
      </DialogHeader>
      <DialogDivider />
      <DialogBody className="w-[28rem]">
        {showProgress ? (
          isSuccess ? (
            <SuccessContent />
          ) : isError ? (
            <ErrorContent error={state.error} />
          ) : (
            <ProgressContent stage={state.stage} />
          )
        ) : isFirmwareLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingIndicator className="size-8 text-stone-400" />
          </div>
        ) : firmware.length === 0 ? (
          <div className="py-4 text-center text-stone-400">
            No firmware available
          </div>
        ) : (
          <SelectionContent
            firmware={firmware}
            selectedKey={selectedKey}
            selectedFirmware={selectedFirmware}
            onSelectionChange={setSelectedKey}
          />
        )}
      </DialogBody>
      <DialogFooter className="justify-end">
        {showProgress ? (
          isComplete ? (
            <DialogCancelButton onClick={handleClose}>
              {isSuccess ? "Done" : "Close"}
            </DialogCancelButton>
          ) : null
        ) : (
          <>
            <DialogCancelButton onClick={handleClose}>
              Cancel
            </DialogCancelButton>
            <DialogConfirmButton
              onClick={canFlash ? handleStartUpdate : undefined}
            >
              Flash Firmware
            </DialogConfirmButton>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}

interface SelectionContentProps {
  firmware: readonly FirmwareListEntry[];
  selectedKey: string;
  selectedFirmware: FirmwareListEntry | undefined;
  onSelectionChange: (key: string) => void;
}

function SelectionContent({
  firmware,
  selectedKey,
  selectedFirmware,
  onSelectionChange,
}: SelectionContentProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-300">Firmware</label>
        <select
          className="rounded border border-stone-600 bg-stone-800 px-3 py-2 text-stone-200"
          value={selectedKey}
          onChange={(e) => onSelectionChange(e.target.value)}
        >
          {firmware.map((entry) => (
            <option key={getFirmwareKey(entry)} value={getFirmwareKey(entry)}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>

      {selectedFirmware && (
        <div className="rounded bg-stone-800 p-3 text-sm text-stone-400">
          Version: {selectedFirmware.latestVersion}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-amber-400">!</span>
          <span className="text-stone-300">
            Make sure the device is in bootloader mode before flashing.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-amber-400">!</span>
          <span className="text-stone-300">
            Do not disconnect the device during the flash process.
          </span>
        </div>
      </div>
    </div>
  );
}

function ProgressContent({ stage }: { stage: FirmwareUpdateStage }) {
  const currentIndex = BOOTLOADER_UPDATE_STAGES.indexOf(stage);

  return (
    <div className="flex flex-col gap-3 py-2">
      {BOOTLOADER_UPDATE_STAGES.map((s, index) => {
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
          Firmware flashed successfully
        </div>
        <div className="mt-1 text-sm text-stone-400">
          The device will now restart
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
        <XIcon className="size-10 text-red-400" />
      </div>
      <div className="text-center">
        <div className="font-medium text-stone-200">Flash failed</div>
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
