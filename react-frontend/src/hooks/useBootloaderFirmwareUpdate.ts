import { useCallback, useMemo } from "react";
import { FirmwareUpdateState } from "../types/firmwareUpdate";
import { useStreamingUpdate } from "./useStreamingUpdate";

interface UseBootloaderFirmwareUpdateOptions {
  deviceType: string;
  variant?: string;
  onSuccess?: () => void;
}

interface UseBootloaderFirmwareUpdateResult {
  state: FirmwareUpdateState;
  startUpdate: () => void;
  reset: () => void;
  isUpdating: boolean;
}

export function useBootloaderFirmwareUpdate({
  deviceType,
  variant,
  onSuccess,
}: UseBootloaderFirmwareUpdateOptions): UseBootloaderFirmwareUpdateResult {
  const keysToRevalidate = useMemo(() => ["devices"], []);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ deviceType });
    if (variant) params.set("variant", variant);
    return `devices/update?${params.toString()}`;
  }, [deviceType, variant]);

  const { state, start, reset } = useStreamingUpdate({
    buildUrl,
    timeoutMs: 30000,
    initialStage: "bootloader",
    timeoutMessage:
      "The update timed out. Please check if the device is in bootloader mode and try again.",
    keysToRevalidate,
    onSuccess,
  });

  const isUpdating =
    state.stage !== "idle" &&
    state.stage !== "success" &&
    state.stage !== "error";

  return {
    state,
    startUpdate: start,
    reset,
    isUpdating,
  };
}
