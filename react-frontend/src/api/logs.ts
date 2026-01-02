import useSWR from "swr";
import { getApiUrl } from "./cardboardApi.ts";

export type LogLevel =
  | "Trace"
  | "Debug"
  | "Information"
  | "Warning"
  | "Error"
  | "Critical";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  exception?: string;
}

export const useLogs = (
  refreshInterval?: number,
): {
  entries: readonly LogEntry[];
  isLoading?: boolean;
  error?: Error;
  mutate: () => void;
} => {
  const { data, isLoading, error, mutate } = useSWR<{
    entries: readonly LogEntry[];
  }>("logs", { refreshInterval });

  return {
    entries: data?.entries ?? [],
    isLoading,
    error,
    mutate,
  };
};

export const clearLogs = async (): Promise<void> => {
  const response = await fetch(getApiUrl("logs"), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to clear logs: ${response.statusText}`);
  }
};
