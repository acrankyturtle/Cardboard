import { Tabs } from "@base-ui-components/react";
import { useCallback, useState } from "react";
import { DeviceList } from "./DeviceList.tsx";
import { EditDeviceProfile } from "./EditDeviceProfile.tsx";

export function DeviceView({ className }: { className?: string }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [editProfileDeviceId, setEditProfileDeviceId] = useState<string | null>(
    null,
  );

  const goToDevices = useCallback(() => {
    setPageIndex(0);
  }, [setPageIndex]);

  const goToEditProfile = useCallback(
    (deviceId: string) => {
      setEditProfileDeviceId(deviceId);
      setPageIndex(1);
    },
    [setEditProfileDeviceId, setPageIndex],
  );

  return (
    <Tabs.Root className={className} value={pageIndex}>
      <Tabs.Panel className="flex size-full flex-col items-center p-4">
        <DeviceList goToEditProfile={goToEditProfile} />
      </Tabs.Panel>
      <Tabs.Panel className="size-full">
        {editProfileDeviceId ? (
          <EditDeviceProfile
            className="size-full"
            deviceId={editProfileDeviceId}
            goToDevices={goToDevices}
          />
        ) : (
          "Loading..."
        )}
      </Tabs.Panel>
    </Tabs.Root>
  );
}
