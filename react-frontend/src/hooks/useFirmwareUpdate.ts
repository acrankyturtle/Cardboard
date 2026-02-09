import { useCallback, useMemo } from "react";
import { FirmwareUpdateState } from "../types/firmwareUpdate";
import { useStreamingUpdate } from "./useStreamingUpdate";

interface UseFirmwareUpdateOptions {
  deviceId: string;
  onSuccess?: () => void;
}

interface UseFirmwareUpdateResult {
  state: FirmwareUpdateState;
  showConfirmation: () => void;
  startUpdate: () => void;
  cancel: () => void;
  reset: () => void;
  isUpdating: boolean;
}

export function useFirmwareUpdate({
  deviceId,
  onSuccess,
}: UseFirmwareUpdateOptions): UseFirmwareUpdateResult {
  const keysToRevalidate = useMemo(
    () => ["devices", `devices/${deviceId}`],
    [deviceId],
  );

  const buildUrl = useCallback(
    () => `devices/${deviceId}/update?migrate=true`,
    [deviceId],
  );

  const { state, start, reset, cleanup, setState } = useStreamingUpdate({
    buildUrl,
    timeoutMs: 60000,
    initialStage: "preparing",
    timeoutMessage:
      "The update timed out. Please check if the device is connected and try again.",
    keysToRevalidate,
    onSuccess,
  });

  const showConfirmation = useCallback(() => {
    setState({ stage: "confirming" });
  }, [setState]);

  const cancel = useCallback(() => {
    cleanup();
    setState({ stage: "idle" });
  }, [cleanup, setState]);

  const isUpdating =
    state.stage !== "idle" &&
    state.stage !== "confirming" &&
    state.stage !== "success" &&
    state.stage !== "error";

  return {
    state,
    showConfirmation,
    startUpdate: start,
    cancel,
    reset,
    isUpdating,
  };
}
