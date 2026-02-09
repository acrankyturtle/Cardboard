import { useEffect, useRef } from "react";
import useSWR, { useSWRConfig } from "swr";
import { getApiUrl } from "./cardboardApi.ts";
import {
  DeviceDetails,
  DeviceProfile,
  DeviceSettings,
  DeviceSummary,
  FirmwareListEntry,
} from "./deviceTypes.ts";

export * from "./deviceTypes.ts";
export * from "./deviceTypeGuards.ts";

export const useDeviceList = (): {
  devices: readonly DeviceSummary[];
  isLoading?: boolean;
  error?: Error;
} => {
  const { data, isLoading, error } = useSWR<{
    devices: readonly DeviceSummary[];
  }>("devices");

  return {
    devices: data?.devices ?? [],
    isLoading,
    error,
  };
};

/**
 * Hook that subscribes to real-time device connection/disconnection events via SSE.
 * Automatically revalidates the device list when devices change.
 * Should be called once at the app level.
 */
export const useDeviceEvents = () => {
  const { mutate } = useSWRConfig();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connect = () => {
      const eventSource = new EventSource(getApiUrl("devices/events"));
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("devicesChanged", () => {
        // Revalidate device list when devices change
        mutate("devices");
      });

      eventSource.onerror = () => {
        eventSource.close();
        // Reconnect after a delay
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [mutate]);
};

export const getDeviceDetails = async (
  deviceId: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(getApiUrl(`devices/${deviceId}`), { signal });

  if (!response.ok) {
    throw new Error(`Failed to fetch device details: ${response.statusText}`);
  }

  const data: { deviceDetails: DeviceDetails } = await response.json();
  return data.deviceDetails;
};

export const useDeviceDetails = (deviceId: string) => {
  const { data, isLoading, error } = useSWR<{ deviceDetails: DeviceDetails }>(
    `devices/${deviceId}`,
  );

  return {
    device: data?.deviceDetails,
    isLoading,
    error,
  };
};

export const getDeviceProfile = async (
  deviceId: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(getApiUrl(`devices/${deviceId}/profile`), {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch device profile: ${response.statusText}`);
  }

  const data: { deviceProfile: DeviceProfile } = await response.json();
  return data.deviceProfile;
};

export const useDeviceProfile = (
  deviceId: string,
): {
  profile: DeviceProfile | undefined;
  isLoading?: boolean;
  error?: Error;
} => {
  const { data, isLoading, error } = useSWR<{ deviceProfile: DeviceProfile }>(
    `devices/${deviceId}/profile`,
  );

  return {
    profile: data?.deviceProfile,
    isLoading,
    error,
  };
};

export const updateDeviceProfile = async (
  deviceId: string,
  profile: DeviceProfile,
): Promise<"success" | { error: string }> => {
  try {
    const response = await fetch(getApiUrl(`devices/${deviceId}/profile`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      return {
        error: `Failed to update device profile: ${response.statusText}`,
      };
    }

    return "success";
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update device profile",
    };
  }
};

export const updateDeviceFirmware = async (
  deviceId: string,
  version?: string,
  migrateData: boolean = true,
): Promise<"success" | { error: string }> => {
  try {
    const url = new URL(getApiUrl(`devices/${deviceId}/update`));
    url.searchParams.set("migrate", migrateData.toString());
    if (version !== undefined) url.searchParams.set("version", version);

    const response = await fetch(url, {
      method: "POST",
    });

    if (!response.ok) {
      return {
        error: `Failed to update device firmware: ${response.statusText}`,
      };
    }

    return "success";
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Failed to update device firmware",
    };
  }
};

export const getDeviceSettings = async (
  deviceId: string,
  signal?: AbortSignal,
): Promise<DeviceSettings> => {
  const response = await fetch(getApiUrl(`devices/${deviceId}/settings`), {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch device settings: ${response.statusText}`);
  }

  const data: { deviceSettings: DeviceSettings } = await response.json();
  return data.deviceSettings;
};

export const updateDeviceSettings = async (
  deviceId: string,
  settings: DeviceSettings,
): Promise<"success" | { error: string }> => {
  try {
    const response = await fetch(getApiUrl(`devices/${deviceId}/settings`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      return {
        error: `Failed to update device settings: ${response.statusText}`,
      };
    }

    return "success";
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Failed to update device settings",
    };
  }
};

export const useFirmwareList = () => {
  const { data, isLoading, error } = useSWR<{
    firmware: readonly FirmwareListEntry[];
  }>("devices/firmware");

  return {
    firmware: data?.firmware ?? [],
    isLoading,
    error,
  };
};

export const useBootloaderStatus = () => {
  const { data } = useSWR<{ available: boolean }>("devices/bootloader", {
    refreshInterval: 2000,
  });

  return {
    available: data?.available ?? false,
  };
};
