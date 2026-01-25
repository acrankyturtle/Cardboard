import clsx from "clsx";
import { useFirmwareUpdate } from "../hooks/useFirmwareUpdate";
import { Button } from "./Button";
import { FirmwareUpdateConfirmDialog } from "./FirmwareUpdateConfirmDialog";
import { FirmwareUpdateDialog } from "./FirmwareUpdateDialog";

interface UpdateFirmwareButtonProps {
  deviceId: string;
  deviceName: string;
  currentVersion: string;
  targetVersion: string;
}

export function UpdateFirmwareButton({
  deviceId,
  deviceName,
  currentVersion,
  targetVersion,
}: UpdateFirmwareButtonProps) {
  const { state, showConfirmation, startUpdate, cancel, reset, isUpdating } =
    useFirmwareUpdate({ deviceId });

  const showConfirmDialog = state.stage === "confirming";
  const showProgressDialog =
    state.stage !== "idle" && state.stage !== "confirming";

  return (
    <>
      <Button
        className={clsx("relative")}
        buttonStyle={{
          variant: "ghost",
        }}
        disabled={isUpdating}
        onClick={showConfirmation}
      >
        Update Firmware
      </Button>

      <FirmwareUpdateConfirmDialog
        open={showConfirmDialog}
        deviceName={deviceName}
        currentVersion={currentVersion}
        targetVersion={targetVersion}
        onConfirm={startUpdate}
        onCancel={cancel}
      />

      <FirmwareUpdateDialog
        open={showProgressDialog}
        state={state}
        onClose={reset}
      />
    </>
  );
}
