import { DeviceList } from "../components/DeviceList.tsx";
import Header from "../components/Header.tsx";
import { EditDeviceSettings } from "../components/EditDeviceSettings.tsx";
import { useBootloaderStatus } from "../api/devices.ts";
import { ReactNode, useState } from "react";
import clsx from "clsx";
import { Button } from "../components/Button.tsx";
import { BootloaderFirmwareUpdateDialog } from "../components/firmwareUpdate/BootloaderFirmwareUpdateDialog.tsx";
import { HelpLink } from "../components/HelpLink.tsx";
import {
  EditDeviceContextProvider,
} from "../lib/editDeviceContext.tsx";
import { DataProvider } from "../components/DataProvider.tsx";
import { DeviceInfoDialog } from "../components/DeviceInfoDialog.tsx";
import { EditDeviceView } from "../components/EditDeviceView.tsx";

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
  const [showBootloaderDialog, setShowBootloaderDialog] = useState(false);
  const { available: bootloaderAvailable } = useBootloaderStatus();

  return (
    <>
      <DevicesHeader>
        <div className="grow">Devices</div>
        {bootloaderAvailable && (
          <Button
            buttonStyle={{ variant: "ghost" }}
            onClick={() => setShowBootloaderDialog(true)}
          >
            Flash Bootloader Device
          </Button>
        )}
        <HelpLink section="getting-started" size="medium" />
      </DevicesHeader>
      <div className="grow overflow-y-auto p-4">
        <div className="flex size-full flex-col items-center">
          <DeviceList showEdit />
        </div>
      </div>
      <BootloaderFirmwareUpdateDialog
        open={showBootloaderDialog}
        onClose={() => setShowBootloaderDialog(false)}
      />
    </>
  );
}

export function StatTable({ children }: { children?: ReactNode }) {
  return (
    <div className="gap-y-h1 grid w-full grid-cols-[auto_1fr] items-center gap-x-8">
      {children}
    </div>
  );
}

export function StatName({ children }: { children?: ReactNode }) {
  return <div className="font-semibold">{children}</div>;
}

export function StatValue({ children }: { children?: ReactNode }) {
  return <div className="text-stone-200">{children}</div>;
}

export function DevicesHeader({
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
