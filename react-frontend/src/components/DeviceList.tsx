import { DeviceSummary, useDeviceList } from "../api/devices.ts";
import { getAssetUrl } from "../api/cardboardApi.ts";
import { useSearchParams } from "react-router";
import { Button } from "./Button.tsx";
import {
  DelayedLoadingIndicator,
  LargeLoadingIndicator,
} from "./LoadingIndicator.tsx";

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

  return devices.length == 0 ? (
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
    <div className="flex items-center justify-between rounded-lg bg-stone-700 px-4 py-2 shadow-sm">
      <div className="flex items-center gap-3">
        {device.iconUrl && (
          <div>
            <img
              className="size-8"
              src={getAssetUrl(device.iconUrl)}
              alt="Icon"
            />{" "}
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
      {showEdit && (
        <Button
          buttonStyle={{ variant: "panelGhost" }}
          onClick={() => setSearchParams({ deviceId: device.id })}
        >
          <EditProfileIcon />
        </Button>
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

function EditProfileIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="24"
      height="24"
      strokeWidth="2"
    >
      <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"></path>
      <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"></path>
      <path d="M16 5l3 3"></path>
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
