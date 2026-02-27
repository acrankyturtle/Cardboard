import clsx from "clsx";
import { useEffect } from "react";
import { FirmwareUpdateStage, STAGE_LABELS } from "../../types/firmwareUpdate";
import { LoadingIndicator } from "../LoadingIndicator";
import {
  CheckIcon,
  ThickRemoveIcon,
} from "@root/react-frontend/src/assets/sharedIcons.tsx";

export const AUTO_DISMISS_DELAY_MS = 5000;

export function useAutoDismiss(
  isSuccess: boolean,
  onClose: () => void,
  delayMs: number = AUTO_DISMISS_DELAY_MS,
) {
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose, delayMs]);
}

export function FirmwareUpdateProgressSteps({
  stage,
  stages,
}: {
  stage: FirmwareUpdateStage;
  stages: FirmwareUpdateStage[];
}) {
  const currentIndex = stages.indexOf(stage);

  return (
    <div className="flex flex-col gap-3 py-2">
      {stages.map((s, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = s === stage;
        const isPending = index > currentIndex;

        return (
          <div key={s} className="flex items-center gap-3">
            <div className="flex w-6 items-center justify-center">
              {isComplete ? (
                <CheckIcon className="size-5 text-lime-400" />
              ) : isCurrent ? (
                <LoadingIndicator className="size-5 text-stone-200" />
              ) : (
                <div className="size-2 rounded-full bg-stone-600" />
              )}
            </div>
            <span
              className={clsx("text-sm", {
                "text-lime-400": isComplete,
                "font-medium text-stone-200": isCurrent,
                "text-stone-500": isPending,
              })}
            >
              {STAGE_LABELS[s]}
            </span>
          </div>
        );
      })}
      <div className="mt-2 text-center text-xs text-stone-500">
        Do not disconnect the device
      </div>
    </div>
  );
}

export function FirmwareUpdateSuccess({
  title = "Firmware updated successfully",
  subtitle = "Your device is ready to use",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-lime-500/20">
        <CheckIcon className="size-10 text-lime-400" />
      </div>
      <div className="text-center">
        <div className="font-medium text-stone-200">{title}</div>
        <div className="mt-1 text-sm text-stone-400">{subtitle}</div>
      </div>
    </div>
  );
}

export function FirmwareUpdateError({
  error,
  title = "Update failed",
}: {
  error?: { code: string; message: string };
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-500/20">
        <ThickRemoveIcon className="size-10 text-red-400" />
      </div>
      <div className="text-center">
        <div className="font-medium text-stone-200">{title}</div>
        <div className="mt-1 text-sm text-stone-400">
          {error?.message || "An unknown error occurred"}
        </div>
        {error?.code && (
          <div className="mt-2 font-mono text-xs text-stone-600">
            {error.code}
          </div>
        )}
      </div>
    </div>
  );
}
