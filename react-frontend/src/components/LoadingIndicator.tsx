import clsx from "clsx";
import { ReactNode, useEffect, useState } from "react";

export function LargeLoadingIndicator({ className }: { className?: string }) {
  return (
    <div className={clsx(className, "size-12 text-stone-200")}>
      <LoadingIndicator />
    </div>
  );
}

export function LoadingIndicator({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12,23a9.63,9.63,0,0,1-8-9.5,9.51,9.51,0,0,1,6.79-9.1A1.66,1.66,0,0,0,12,2.81h0a1.67,1.67,0,0,0-1.94-1.64A11,11,0,0,0,12,23Z"
          fill="currentColor"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            dur="0.75s"
            values="0 12 12;360 12 12"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
}

export function DelayedLoadingIndicator({
  delayMs,
  renderLoading,
  renderWait,
}: {
  delayMs: number;
  renderLoading: () => ReactNode;
  renderWait: () => ReactNode;
}) {
  const [delayedIsLoading, setDelayedIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayedIsLoading(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, []);

  return <>{delayedIsLoading ? renderLoading() : renderWait()}</>;
}
