import { DeviceSummary, useDeviceList } from "../api/devices.ts";
import { getAssetUrl } from "../api/cardboardApi.ts";
import { useSearchParams } from "react-router";
import { Button } from "./Button.tsx";
import {
  DelayedLoadingIndicator,
  LargeLoadingIndicator,
} from "./LoadingIndicator.tsx";
import { EditIcon } from "../assets/sharedIcons.tsx";

export function DeviceList({ showEdit }: { showEdit?: boolean }) {
  const { devices, isLoading } = useDeviceList();

  if (isLoading) {
    return (
      <DelayedLoadingIndicator
        delayMs={250}
        renderLoading={() => <LargeLoadingIndicator className="m-2" />}
        renderWait={() => <></>}
      />
    );
  }

  return devices.length === 0 ? (
    <div>No devices found</div>
  ) : (
    <ul className="w-5xl shrink-1 space-y-4">
      {devices.map((device) => (
        <li key={device.id}>
          <DeviceCard device={device} showEdit={showEdit} />
        </li>
      ))}
    </ul>
  );
}

function DeviceCard({
  device,
  showEdit,
}: {
  device: DeviceSummary;
  showEdit?: boolean;
}) {
  const [_, setSearchParams] = useSearchParams();

  return (
    <div className="flex items-center justify-between gap-1 rounded-lg bg-stone-700 px-4 py-2 shadow-sm">
      <div className="flex grow items-center gap-3">
        {device.iconUrl && (
          <div>
            <img
              className="size-8 rounded-md"
              src={getAssetUrl(device.iconUrl)}
              alt="Icon"
            />
          </div>
        )}
        <div>
          <div>{device.name}</div>
          <div className="ml-2">
            <DeviceCardDetail name="id" value={device.id} />
            <DeviceCardDetail name="model" value={device.model} />
          </div>
        </div>
      </div>
      <Button
        buttonStyle={{ variant: "panelGhost" }}
        onClick={() => setSearchParams({ deviceId: device.id, action: "info" })}
      >
        <InfoIcon />
      </Button>
      {showEdit && (
        <>
          <Button
            buttonStyle={{ variant: "panelGhost" }}
            onClick={() =>
              setSearchParams({ deviceId: device.id, action: "edit" })
            }
          >
            <EditProfileIcon />
          </Button>
          <Button
            buttonStyle={{ variant: "panelGhost" }}
            onClick={() =>
              setSearchParams({ deviceId: device.id, action: "settings" })
            }
          >
            <EditSettingsIcon />
          </Button>
        </>
      )}
    </div>
  );
}

function DeviceCardDetail({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex gap-1 text-xs text-stone-400">
      <div className="italic">{name}:</div>
      <div>{value}</div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      className="size-[1.625rem]"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      <path d="M12 9h.01" />
      <path d="M11 12h1v4h1" />
    </svg>
  );
}

function EditProfileIcon() {
  return <EditIcon className="size-6" />;
}

function EditSettingsIcon() {
  return (
    <svg
      className="size-6"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M6 4v4" />
      <path d="M6 12v8" />
      <path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M12 4v10" />
      <path d="M12 18v2" />
      <path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M18 4v1" />
      <path d="M18 9v11" />
    </svg>
  );
}

// function KeyboardIcon() {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       width="24"
//       height="24"
//       strokeWidth="2"
//     >
//       <path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z"></path>
//       <path d="M6 10l0 .01"></path>
//       <path d="M10 10l0 .01"></path>
//       <path d="M14 10l0 .01"></path>
//       <path d="M18 10l0 .01"></path>
//       <path d="M6 14l0 .01"></path>
//       <path d="M18 14l0 .01"></path>
//       <path d="M10 14l4 .01"></path>
//     </svg>
//   );
// }
