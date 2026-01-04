import { DeviceList } from "../components/DeviceList.tsx";
import Header from "../components/Header.tsx";
import { EditDeviceProfile } from "../components/EditDeviceProfile.tsx";
import { EditDeviceSettings } from "../components/EditDeviceSettings.tsx";
import {
  DeviceDetails,
  DeviceProfile,
  DeviceStatusError,
  getDeviceDetails,
  getDeviceProfile,
  updateDeviceProfile,
} from "../api/devices.ts";
import { ReactNode, useEffect, useState } from "react";
import clsx from "clsx";
import { Button, getButtonClassName } from "../components/Button.tsx";
import { Link, useNavigate } from "react-router";
import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderTitle,
} from "../components/Dialog.tsx";
import { LoadingIndicator } from "../components/LoadingIndicator.tsx";
import { getAssetUrl } from "../api/cardboardApi.ts";
import { InputClassName } from "../components/Input.tsx";
import { UpdateFirmwareButton } from "../components/UpdateFirmwareButton.tsx";
import {
  EditDeviceContextProvider,
  useEditDeviceContext,
} from "../lib/editDeviceContext.tsx";
import { NavigationBlocker } from "../components/NavigationBlocker.tsx";

export function DevicesIndex({
  deviceId,
  action,
}: {
  deviceId: string | null;
  action: string | null;
}) {
  return (
    <>
      <div className="flex size-full flex-col justify-items-center">
        {deviceId && action === "edit" ? (
          <DataProvider
            deviceId={deviceId}
            loadingHeader={<DevicesHeader>Edit</DevicesHeader>}
          >
            {(device, profile) => (
              <EditDeviceContextProvider
                device={device}
                originalProfile={profile}
              >
                <EditDeviceView />
              </EditDeviceContextProvider>
            )}
          </DataProvider>
        ) : deviceId && action === "settings" ? (
          <DataProvider
            deviceId={deviceId}
            loadingHeader={<DevicesHeader>Settings</DevicesHeader>}
          >
            {(device) => <EditDeviceSettings device={device} />}
          </DataProvider>
        ) : (
          <>
            <DeviceIndexView />
            <DeviceInfoDialog deviceId={deviceId} />
          </>
        )}
      </div>
    </>
  );
}

function DeviceIndexView() {
  return (
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
  );
}

function DeviceInfoDialog({ deviceId }: { deviceId: string | null }) {
  const navigate = useNavigate();

  // use latch to avoid clearing data during transitions
  const [latch, setLatch] = useState(deviceId);
  useEffect(() => {
    if (deviceId) {
      setLatch(deviceId);
    }
  }, [deviceId]);
  const [lastFirmwareResult, setLastFirmwareResult] = useState<
    "success" | { error: string } | null
  >(null);

  return (
    latch && (
      <DataProvider deviceId={latch}>
        {(device, profile) => (
          <Dialog
            open={deviceId !== null}
            onClose={(show) => {
              if (!show) navigate("/devices");
            }}
          >
            <DialogHeader>
              <DialogHeaderTitle className="flex items-center gap-3">
                {device.iconUrl && (
                  <div>
                    <img
                      className="size-8"
                      src={getAssetUrl(device.iconUrl)}
                      alt="Icon"
                    />
                  </div>
                )}
                Device Details
              </DialogHeaderTitle>
            </DialogHeader>
            <DialogDivider />
            <DialogBody className="w-[40rem]">
              <StatTable>
                <StatName>Id</StatName>
                <StatValue>{device.id}</StatValue>
                <StatName>Name</StatName>
                <StatValue>{device.name}</StatValue>
                <StatName>Type</StatName>
                <StatValue>{device.type}</StatValue>
                {device.variant !== undefined && (
                  <>
                    <StatName>Variant</StatName>
                    <StatValue>{device.variant}</StatValue>
                  </>
                )}
                <StatName>Model</StatName>
                <StatValue>{device.model}</StatValue>
                <StatName>Firmware Version</StatName>
                <StatValue>{device.version}</StatValue>
                <StatName>Latest Version</StatName>
                <StatValue>
                  <div className="flex items-center gap-1.5">
                    {device.latestVersion !== undefined &&
                    device.latestVersion > device.version ? (
                      <>
                        {device.latestVersion}
                        <UpdateFirmwareButton
                          deviceId={device.id}
                          onResult={(r) => setLastFirmwareResult(r)}
                        />
                      </>
                    ) : (
                      device.latestVersion
                    )}
                    {lastFirmwareResult === "success" ? (
                      <div className="font-semibold text-lime-700">Success</div>
                    ) : (
                      <div className="font-semibold text-red-500">
                        {lastFirmwareResult !== null &&
                          lastFirmwareResult.error}
                      </div>
                    )}
                  </div>
                </StatValue>
                <DialogDivider className="col-span-2 my-4" />
                <StatName>Keys</StatName>
                <StatValue>{profile.keys.length}</StatValue>
                <StatName>Macros</StatName>
                <StatValue>{profile.macros.length}</StatValue>
                <StatName>Virtual Keys</StatName>
                <StatValue>
                  {profile.virtualKeys.length}/{device.virtualKeyCount}
                </StatValue>
                <DialogDivider className="col-span-2 my-4" />
                <StatName>Mouse</StatName>
                <StatValue>
                  {device.settings.isMouseEnabled ? "Enabled" : "Disabled"}
                </StatValue>
                <DialogDivider className="col-span-2 my-4" />
                <StatName>Tick</StatName>
                <StatValue>{device.status.tick} us</StatValue>
                <StatName>Allocator</StatName>
                <StatValue>
                  {`${device.status.allocated} / ${device.status.allocatorSize} (${((device.status.allocated / device.status.allocatorSize) * 100).toPrecision(2)}%)`}
                </StatValue>
              </StatTable>
              {device.status.errors.length > 0 && (
                <>
                  <DialogDivider className="col-span-2 my-4" />
                  <ErrorView errors={device.status.errors} />
                </>
              )}
            </DialogBody>
            <DialogFooter className="justify-end">
              <DialogCancelButton
                className="px-5"
                onClick={() => navigate("/devices")}
              >
                Close
              </DialogCancelButton>
            </DialogFooter>
          </Dialog>
        )}
      </DataProvider>
    )
  );
}

function StatTable({ children }: { children?: ReactNode }) {
  return (
    <div className="gap-y-h1 grid w-full grid-cols-[auto_1fr] items-center gap-x-8">
      {children}
    </div>
  );
}

function StatName({ children }: { children?: ReactNode }) {
  return <div className="font-semibold">{children}</div>;
}

function StatValue({ children }: { children?: ReactNode }) {
  return <div className="text-stone-200">{children}</div>;
}

function ErrorView({ errors }: { errors: readonly DeviceStatusError[] }) {
  return (
    <>
      <div className="font-semibold">Errors</div>
      <div
        className={clsx(
          InputClassName,
          "flex h-56 w-full flex-col gap-1 overflow-y-auto",
        )}
      >
        {errors.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded border border-stone-900 bg-stone-700 p-2 shadow"
          >
            <div>{e.timestamp}</div>
            <div>{e.message}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function EditDeviceView() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { state } = useEditDeviceContext();

  const hasChanges =
    JSON.stringify(state.profile) !== JSON.stringify(state.originalProfile);

  return (
    <>
      <NavigationBlocker
        hasChanges={hasChanges}
        message="You have unsaved profile changes. Are you sure you want to leave?"
      />
      <DevicesHeader>
        <div className="flex grow items-end gap-3">
          <div>Edit</div>
          <div className="text-lg font-normal">{state.device.name}</div>
          <div className="text-lg font-normal">{state.device.id}</div>
        </div>
        <div
          className={clsx("p-1 text-lg text-green-500 transition", {
            "opacity-0 duration-[2000ms]": !saveSuccess,
            "opacity-100 duration-[0ms]": saveSuccess,
          })}
        >
          Profile saved successfully
        </div>
        {saveError && <div className="text-lg text-red-500">{saveError}</div>}
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

            updateDeviceProfile(state.device.id, state.profile).then((v) => {
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
        <EditDeviceProfile className="h-full" />
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
    <Header
      className={clsx("sticky top-0 flex gap-2 justify-self-start", className)}
    >
      {children}
    </Header>
  );
}

function DataProvider({
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
    let canceled = false;
    setError(null);
    setDevice(undefined);
    setProfile(undefined);

    getDeviceDetails(deviceId)
      .then((d) => {
        if (canceled) return;
        setDevice(d);
      })
      .catch((e) => {
        if (canceled) return;
        setError(e instanceof Error ? e.message : "Failed to load device");
      });

    getDeviceProfile(deviceId)
      .then((p) => {
        if (canceled) return;
        setProfile(p);
      })
      .catch((e) => {
        if (canceled) return;
        setError(e instanceof Error ? e.message : "Failed to load profile");
      });

    return () => {
      canceled = true;
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
