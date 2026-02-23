import { useConnectionStatus } from "../hooks/useConnectionStatus.tsx";
import { LoadingIndicator } from "./LoadingIndicator.tsx";
import {
  Dialog,
  DialogBody,
  DialogDivider,
  DialogHeader,
  DialogHeaderDescription,
  DialogHeaderTitle,
} from "@root/react-frontend/src/components/Dialog.tsx";

export function ConnectionLostOverlay() {
  const { connected } = useConnectionStatus();

  return (
    <Dialog className="items-center" open={!connected}>
      <DialogHeader>
        <DialogHeaderTitle>Connection Lost</DialogHeaderTitle>
        <DialogHeaderDescription></DialogHeaderDescription>
        <DialogBody>
          <div>
            <p>Unable to reach the Controller service.</p>
            <p>Please make sure the Cardboard Controller is running.</p>
          </div>
          <DialogDivider className="mt-2 mb-5" />
          <div className="flex flex-col items-center">
            <p className="text-lg">Reconnecting...</p>
            <div className="mt-2 mb-4 size-12">
              <LoadingIndicator />
            </div>
          </div>
        </DialogBody>
      </DialogHeader>
    </Dialog>
  );
}
