import { useEffect } from "react";

export const useWarnOnNavigate = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    addEventListener("beforeunload", handler);
    return () => removeEventListener("beforeunload", handler);
  }, [enabled]);
};

const handler = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = true;
};
