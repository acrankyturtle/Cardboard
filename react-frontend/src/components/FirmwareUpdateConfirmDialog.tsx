import {
  Dialog,
  DialogBody,
  DialogCancelButton,
  DialogConfirmButton,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderDescription,
  DialogHeaderTitle,
} from "./Dialog";

interface FirmwareUpdateConfirmDialogProps {
  open: boolean;
  deviceName: string;
  currentVersion: string;
  targetVersion: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FirmwareUpdateConfirmDialog({
  open,
  deviceName,
  currentVersion,
  targetVersion,
  onConfirm,
  onCancel,
}: FirmwareUpdateConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={() => onCancel()} closeOnBackdropClick={false}>
      <DialogHeader>
        <DialogHeaderTitle>Update Firmware</DialogHeaderTitle>
        <DialogHeaderDescription>
          Confirm firmware update for {deviceName}
        </DialogHeaderDescription>
      </DialogHeader>
      <DialogDivider />
      <DialogBody className="w-[28rem]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded bg-stone-800 p-3">
            <div className="text-stone-400">Version</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-stone-300">{currentVersion}</span>
              <span className="text-stone-500">→</span>
              <span className="font-mono font-semibold text-lime-400">
                {targetVersion}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">!</span>
              <span className="text-stone-300">
                Do not disconnect the device during the update process.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lime-400">+</span>
              <span className="text-stone-300">
                Your profile and settings will be preserved.
              </span>
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="justify-end">
        <DialogCancelButton onClick={onCancel}>Cancel</DialogCancelButton>
        <DialogConfirmButton onClick={onConfirm}>Update Now</DialogConfirmButton>
      </DialogFooter>
    </Dialog>
  );
}
