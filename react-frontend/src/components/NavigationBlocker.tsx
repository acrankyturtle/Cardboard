import { useEffect } from "react";
import { useBlocker } from "react-router";
import {
  Dialog,
  DialogBody,
  DialogDivider,
  DialogFooter,
  DialogHeader,
  DialogHeaderTitle,
  DialogCancelButton,
  DialogConfirmButton,
} from "./Dialog.tsx";

export function NavigationBlocker({
  hasChanges,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: {
  hasChanges: boolean;
  message?: string;
}) {
  const blocker = useBlocker(hasChanges);

  // Handle browser beforeunload for closing tab/window
  useEffect(() => {
    if (!hasChanges) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    addEventListener("beforeunload", handler);
    return () => removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const handleStay = () => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  const handleLeave = () => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  };

  return (
    <Dialog
      open={blocker.state === "blocked"}
      onClose={handleStay}
      closeOnBackdropClick={false}
    >
      <DialogHeader>
        <DialogHeaderTitle>Unsaved Changes</DialogHeaderTitle>
      </DialogHeader>
      <DialogDivider />
      <DialogBody className="max-w-md">
        <p>{message}</p>
      </DialogBody>
      <DialogFooter className="justify-end">
        <DialogCancelButton className="min-w-24" onClick={handleStay}>
          Stay
        </DialogCancelButton>
        <DialogConfirmButton onClick={handleLeave}>Leave</DialogConfirmButton>
      </DialogFooter>
    </Dialog>
  );
}
