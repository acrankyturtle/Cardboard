import { Button } from "./Button.tsx";
import { useCallback, useState } from "react";
import { LoadingIndicator } from "./LoadingIndicator.tsx";
import clsx from "clsx";
import { DialogBackdrop } from "@headlessui/react";
import { updateDeviceFirmware } from "../api/devices.ts";

export function UpdateFirmwareButton({
  deviceId,
  onResult,
}: {
  deviceId: string;
  onResult?: (result: "success" | { error: string } | null) => void;
}) {
  const [updating, setUpdating] = useState(false);

  const onClick = useCallback(() => {
    setUpdating(true);
    onResult?.(null);
    updateDeviceFirmware(deviceId)
      .then((r) => {
        setUpdating(false);
        onResult?.(r);
      })
      .catch((e) => {
        setUpdating(false);
        onResult?.({
          error: e instanceof Error ? e.message : "Failed to update firmware",
        });
      });
  }, [deviceId, onResult]);

  return (
    <>
      {updating && (
        <DialogBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      )}
      <Button
        className={clsx("relative", { "shadow-md shadow-black/25": updating })}
        buttonStyle={{
          variant: "ghost",
          focusRing: updating ? "none" : "normal",
        }}
        // disabled={updating}
        onClick={onClick}
      >
        <div
          className={clsx({
            "opacity-0": updating,
          })}
        >
          Update Firmware
        </div>
        {updating && <LoadingIndicator className="absolute w-5" />}
      </Button>
    </>
  );
}
