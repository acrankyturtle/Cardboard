import { useCallback, useEffect, useState } from "react";
import { useBootloaderFirmwareUpdate } from "../../hooks/useBootloaderFirmwareUpdate";
import { FirmwareListEntry, useFirmwareList } from "../../api/devices";
import { FirmwareUpdateStage } from "../../types/firmwareUpdate";
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
} from "../Dialog";
import { LoadingIndicator } from "../LoadingIndicator";
import {
  useAutoDismiss,
  FirmwareUpdateProgressSteps,
  FirmwareUpdateSuccess,
  FirmwareUpdateError,
} from "./firmwareUpdateShared";

interface BootloaderFirmwareUpdateDialogProps {
  open: boolean;
  onClose: () => void;
}

// These are the only stages relevant for bootloader updates
const BOOTLOADER_UPDATE_STAGES: FirmwareUpdateStage[] = [
  "bootloader",
  "flashing",
];

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

  useAutoDismiss(isSuccess, handleClose);

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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canFlash) handleStartUpdate();
        }}
      >
        <DialogBody className="w-[28rem]">
          {showProgress ? (
            isSuccess ? (
              <FirmwareUpdateSuccess
                title="Firmware flashed successfully"
                subtitle="The device will now restart"
              />
            ) : isError ? (
              <FirmwareUpdateError error={state.error} title="Flash failed" />
            ) : (
              <FirmwareUpdateProgressSteps
                stage={state.stage}
                stages={BOOTLOADER_UPDATE_STAGES}
              />
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
      </form>
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
