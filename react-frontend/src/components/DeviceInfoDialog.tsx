import { useEffect, useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router";
import { DeviceStatusError } from "../api/devices.ts";
import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderTitle,
} from "./Dialog.tsx";
import { SvgIcon } from "./SvgIcon.tsx";
import { InputClassName } from "./Input.tsx";
import { UpdateFirmwareButton } from "./firmwareUpdate/UpdateFirmwareButton.tsx";
import { DataProvider } from "./DataProvider.tsx";
import { StatTable, StatName, StatValue } from "../pages/DevicesIndex.tsx";

export function DeviceInfoDialog({ deviceId }: { deviceId: string | null }) {
  const navigate = useNavigate();

  // use latch to avoid clearing data during transitions
  const [latch, setLatch] = useState(deviceId);
  useEffect(() => {
    if (deviceId) {
      setLatch(deviceId);
    }
  }, [deviceId]);

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
                  <SvgIcon className="size-8" url={device.iconUrl} />
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
                <StatValue>
                  {device.name || (
                    <span className="italic opacity-40">(none)</span>
                  )}
                </StatValue>
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
                  <div className="flex items-center gap-2.5">
                    {device.updateAvailable ? (
                      <>
                        {device.latestVersion}
                        <UpdateFirmwareButton
                          deviceId={device.id}
                          deviceName={device.name}
                          currentVersion={device.version}
                          targetVersion={device.latestVersion!}
                        />
                      </>
                    ) : (
                      device.latestVersion
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
                <StatName>Allocator current (bytes)</StatName>
                <StatValue>
                  {`${device.status.allocated} / ${device.status.allocatorSize} (${((device.status.allocated / device.status.allocatorSize) * 100).toPrecision(2)}%)`}
                </StatValue>
                <StatName>Allocator maximum (bytes)</StatName>
                <StatValue>
                  {device.status.maxAllocated} (
                  {(
                    (device.status.maxAllocated / device.status.allocatorSize) *
                    100
                  ).toPrecision(2)}
                  %)
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
