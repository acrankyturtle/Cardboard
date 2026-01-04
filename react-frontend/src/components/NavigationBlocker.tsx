import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
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
  const [showDialog, setShowDialog] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const navigate = useNavigate();
  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;

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

  // Intercept all link clicks
  useEffect(() => {
    if (!hasChanges) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.target
      ) {
        const href = anchor.getAttribute("href");
        if (
          href &&
          href !== window.location.pathname + window.location.search
        ) {
          event.preventDefault();
          event.stopPropagation();
          pendingHref.current = href;
          setShowDialog(true);
        }
      }
    };

    // Use capture phase to intercept before React Router handles it
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [hasChanges]);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!hasChanges) return;

    const currentPath = window.location.pathname + window.location.search;

    const handlePopState = () => {
      if (hasChangesRef.current) {
        // Prevent navigation by pushing current state back
        window.history.pushState(null, "", currentPath);
        pendingHref.current = "back";
        setShowDialog(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasChanges]);

  const handleStay = () => {
    setShowDialog(false);
    pendingHref.current = null;
  };

  const handleLeave = () => {
    const href = pendingHref.current;
    setShowDialog(false);
    pendingHref.current = null;

    if (href === "back") {
      window.history.back();
    } else if (href) {
      navigate(href);
    }
  };

  return (
    <Dialog open={showDialog} onClose={handleStay} closeOnBackdropClick={false}>
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
