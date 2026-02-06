import { useCallback, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { getApiUrl } from "../api/cardboardApi";
import {
  BACKEND_STAGE_MAP,
  FirmwareUpdateError,
  FirmwareUpdateEvent,
  FirmwareUpdateStage,
} from "../types/firmwareUpdate";

const UPDATE_TIMEOUT_MS = 30000;

export interface BootloaderFirmwareUpdateState {
  stage: FirmwareUpdateStage;
  error?: FirmwareUpdateError;
}

interface UseBootloaderFirmwareUpdateOptions {
  deviceType: string;
  variant?: string;
  onSuccess?: () => void;
}

interface UseBootloaderFirmwareUpdateResult {
  state: BootloaderFirmwareUpdateState;
  startUpdate: () => void;
  reset: () => void;
  isUpdating: boolean;
}

export function useBootloaderFirmwareUpdate({
  deviceType,
  variant,
  onSuccess,
}: UseBootloaderFirmwareUpdateOptions): UseBootloaderFirmwareUpdateResult {
  const [state, setState] = useState<BootloaderFirmwareUpdateState>({
    stage: "idle",
  });
  const { mutate } = useSWRConfig();
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const setError = useCallback((error: FirmwareUpdateError) => {
    setState({ stage: "error", error });
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState({ stage: "idle" });
  }, [cleanup]);

  const startUpdate = useCallback(async () => {
    cleanup();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      setError({
        code: "Timeout",
        message:
          "The update timed out. Please check if the device is in bootloader mode and try again.",
      });
      cleanup();
    }, UPDATE_TIMEOUT_MS);

    setState({ stage: "bootloader" });

    try {
      const url = new URL(getApiUrl("devices/update"));
      url.searchParams.set("deviceType", deviceType);
      if (variant) {
        url.searchParams.set("variant", variant);
      }

      const response = await fetch(url, {
        method: "POST",
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        return;
      }

      if (!response.ok || !response.body) {
        const errorData = (await response.json().catch(() => null)) as {
          result?: string;
          message?: string;
        } | null;

        setError({
          code: errorData?.result || "UnknownError",
          message:
            errorData?.message ||
            `Failed to update firmware: ${response.statusText}`,
        });
        cleanup();
        return;
      }

      // Read streaming SSE response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (separated by double newlines)
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || ""; // Keep incomplete message in buffer

        for (const message of messages) {
          if (!message.trim()) continue;

          // Extract data from SSE message
          const dataLine = message
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;

          try {
            const evt = JSON.parse(dataLine.slice(6)) as FirmwareUpdateEvent;

            switch (evt.type) {
              case "progress": {
                const frontendStage = BACKEND_STAGE_MAP[evt.stage];
                if (frontendStage) {
                  setState({ stage: frontendStage });
                }
                break;
              }
              case "success":
                completed = true;
                setState({ stage: "success" });
                mutate("devices");
                cleanup();
                onSuccess?.();
                return;
              case "error":
                completed = true;
                setError({
                  code: evt.result,
                  message: evt.message,
                });
                cleanup();
                return;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // If we reach here without a terminal event, something went wrong
      if (!completed) {
        setError({
          code: "UnexpectedEnd",
          message: "The update ended unexpectedly.",
        });
        cleanup();
      }
    } catch (e) {
      if (abortController.signal.aborted) {
        return;
      }

      setError({
        code: "NetworkError",
        message: e instanceof Error ? e.message : "Failed to update firmware",
      });
      cleanup();
    }
  }, [deviceType, variant, cleanup, setError, mutate, onSuccess]);

  const isUpdating =
    state.stage !== "idle" &&
    state.stage !== "success" &&
    state.stage !== "error";

  return {
    state,
    startUpdate,
    reset,
    isUpdating,
  };
}
