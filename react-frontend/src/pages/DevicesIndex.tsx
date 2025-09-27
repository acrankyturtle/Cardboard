import { DeviceList } from "../components/DeviceList.tsx";
import Header from "../components/Header.tsx";
import { EditDeviceProfile } from "../components/EditDeviceProfile.tsx";
import {
  DeviceDetails,
  DeviceProfile,
  updateDeviceProfile,
  useDeviceDetails,
  useDeviceProfile,
} from "../api/devices.ts";
import { ReactNode, useState } from "react";
import clsx from "clsx";
import { Button, getButtonClassName } from "../components/Button.tsx";
import { Link } from "react-router";
import {
  Dialog,
  DialogBody,
  DialogDivider,
  DialogHeader,
} from "../components/Dialog.tsx";
import { LoadingIndicator } from "../components/LoadingIndicator.tsx";

export function DevicesIndex({ deviceId }: { deviceId: string | null }) {
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  return (
    <>
      <div className="flex size-full flex-col justify-items-center">
        {deviceId ? (
          <DataProvider deviceId={deviceId}>
            {(device, profile) => (
              <>
                <DevicesHeader className="flex gap-2">
                  <div className="grow">Devices</div>
                  <div
                    className={clsx("text-lg text-green-500 transition", {
                      "opacity-0 duration-[2000ms]": !saveSuccess,
                      "opacity-100 duration-[0ms]": saveSuccess,
                    })}
                  >
                    Profile saved successfully
                  </div>
                  {saveError && (
                    <div className="text-lg text-red-500">{saveError}</div>
                  )}
                  <Link
                    className={clsx("min-w-18 px-3", getButtonClassName({}))}
                    to="/devices"
                  >
                    Cancel
                  </Link>
                  <Button
                    className="min-w-24 px-3"
                    buttonStyle={{ variant: "submit" }}
                    onClick={() => {
                      if (saving) return;
                      setSaving(true);
                      setSaveError(null);

                      updateDeviceProfile(deviceId, profile).then((v) => {
                        setSaving(false);
                        if (v !== "success") {
                          setSaveError(v.error);
                        } else {
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 5000);
                        }
                      });
                    }}
                  >
                    Save
                  </Button>
                </DevicesHeader>
                <div className="grow overflow-y-hidden border-l-3 border-stone-950">
                  <EditDeviceProfile
                    className="h-full"
                    device={device}
                    profile={profile}
                  />
                </div>
              </>
            )}
          </DataProvider>
        ) : (
          <>
            <DevicesHeader>
              <div>Devices</div>
            </DevicesHeader>
            <div className="grow overflow-y-auto p-4">
              <div className="flex size-full flex-col items-center">
                <DeviceList showEdit />
              </div>
            </div>
          </>
        )}
      </div>
      <Dialog open={saving}>
        <DialogHeader>Saving...</DialogHeader>
        <DialogDivider />
        <DialogBody className="items-center">
          <div className="mb-2">
            Your profile is currently being transferred to the device.
          </div>
          <div className="mb-6">Please wait...</div>
          <LoadingIndicator className="mb-10 size-24" />
        </DialogBody>
      </Dialog>
    </>
  );
}

function DevicesHeader({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Header className={clsx("sticky top-0 justify-self-start", className)}>
      {children}
    </Header>
  );
}

function DataProvider({
  deviceId,
  children,
}: {
  deviceId: string;
  children: (device: DeviceDetails, profile: DeviceProfile) => ReactNode;
}) {
  const { device } = useDeviceDetails(deviceId);
  const { profile } = useDeviceProfile(deviceId);

  return device && profile ? children(device, profile) : <></>;
}
