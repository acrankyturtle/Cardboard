import { ReactNode, useEffect, useState } from "react";
import {
  DeviceDetails,
  DeviceProfile,
  getDeviceDetails,
  getDeviceProfile,
} from "../api/devices.ts";
import { LoadingIndicator } from "./LoadingIndicator.tsx";

export function DataProvider({
  deviceId,
  loadingHeader,
  children,
}: {
  deviceId: string;
  loadingHeader?: ReactNode;
  children: (device: DeviceDetails, profile: DeviceProfile) => ReactNode;
}) {
  const [device, setDevice] = useState<DeviceDetails | undefined>(undefined);
  const [profile, setProfile] = useState<DeviceProfile | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    setError(null);
    setDevice(undefined);
    setProfile(undefined);

    getDeviceDetails(deviceId, signal)
      .then((d) => {
        setDevice(d);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load device");
      });

    getDeviceProfile(deviceId, signal)
      .then((p) => {
        setProfile(p);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load profile");
      });

    return () => {
      abortController.abort();
    };
  }, [deviceId]);

  if (error) {
    return (
      <>
        {loadingHeader}
        <div className="flex size-full flex-col items-center justify-center gap-4 text-stone-400">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </>
    );
  }

  if (!device || !profile) {
    return (
      <>
        {loadingHeader}
        <div className="flex size-full items-center justify-center">
          <LoadingIndicator className="size-12 text-stone-400" />
        </div>
      </>
    );
  }

  return <>{children(device, profile)}</>;
}
