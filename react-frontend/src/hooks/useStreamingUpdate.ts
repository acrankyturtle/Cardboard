import { useCallback, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { getApiUrl } from "../api/cardboardApi";
import {
  BACKEND_STAGE_MAP,
  FirmwareUpdateError,
  FirmwareUpdateEvent,
  FirmwareUpdateState,
  FirmwareUpdateStage,
} from "../types/firmwareUpdate";

interface UseStreamingUpdateOptions {
  buildUrl: () => string;
  timeoutMs: number;
  initialStage: FirmwareUpdateStage;
  timeoutMessage: string;
  keysToRevalidate: string[];
  onSuccess?: () => void;
}

interface UseStreamingUpdateResult {
  state: FirmwareUpdateState;
  start: () => void;
  reset: () => void;
  cleanup: () => void;
  setError: (error: FirmwareUpdateError) => void;
  setState: React.Dispatch<React.SetStateAction<FirmwareUpdateState>>;
}

export function useStreamingUpdate({
  buildUrl,
  timeoutMs,
  initialStage,
  timeoutMessage,
  keysToRevalidate,
  onSuccess,
}: UseStreamingUpdateOptions): UseStreamingUpdateResult {
  const [state, setState] = useState<FirmwareUpdateState>({ stage: "idle" });
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

  const start = useCallback(async () => {
    cleanup();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    timeoutRef.current = setTimeout(() => {
      setError({
        code: "Timeout",
        message: timeoutMessage,
      });
      cleanup();
    }, timeoutMs);

    setState({ stage: initialStage });

    try {
      const url = new URL(getApiUrl(buildUrl()));

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        for (const message of messages) {
          if (!message.trim()) continue;

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
                for (const key of keysToRevalidate) {
                  mutate(key);
                }
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
  }, [buildUrl, timeoutMs, initialStage, timeoutMessage, keysToRevalidate, cleanup, setError, mutate, onSuccess]);

  return {
    state,
    start,
    reset,
    cleanup,
    setError,
    setState,
  };
}
