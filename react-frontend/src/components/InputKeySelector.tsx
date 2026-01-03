import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Button } from "./Button.tsx";
import { Select, SelectOption } from "./SelectBox.tsx";
import {
  INPUT_KEY_GROUPS,
  KEY_CODE_TO_INPUT_KEY,
  MOUSE_BUTTON_TO_INPUT_KEY,
} from "../api/associations.ts";

interface InputKeySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function InputKeySelector({
  value,
  onChange,
  className,
}: InputKeySelectorProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const preventContextMenuRef = useRef(false);

  const stopBinding = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  const handleBind = useCallback(() => {
    if (countdown !== null) {
      stopBinding();
      return;
    }

    setCountdown(5);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          stopBinding();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdown, stopBinding]);

  const handleKeyCapture = useCallback(
    (inputKey: string) => {
      onChange(inputKey);
      stopBinding();
    },
    [onChange, stopBinding],
  );

  useEffect(() => {
    if (countdown === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const inputKey = KEY_CODE_TO_INPUT_KEY[e.code];
      if (inputKey) {
        handleKeyCapture(inputKey);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Set flag to prevent contextmenu for this mousedown
      if (e.button === 2) {
        preventContextMenuRef.current = true;
        setTimeout(() => {
          preventContextMenuRef.current = false;
        }, 100);
      }

      const inputKey = MOUSE_BUTTON_TO_INPUT_KEY[e.button];
      if (inputKey) {
        handleKeyCapture(inputKey);
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.deltaY < 0) {
        handleKeyCapture("ScrollUp");
      } else if (e.deltaY > 0) {
        handleKeyCapture("ScrollDown");
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("mousedown", handleMouseDown, { capture: true });
    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("mousedown", handleMouseDown, {
        capture: true,
      });
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [countdown, handleKeyCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const isBinding = countdown !== null;

  // Always-mounted contextmenu prevention
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (preventContextMenuRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, {
      capture: true,
    });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, {
        capture: true,
      });
    };
  }, []);

  return (
    <div className={clsx("flex items-center gap-1", className)}>
      <Select
        className="min-w-32 grow"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isBinding}
      >
        <SelectOption value="None">Select input...</SelectOption>
        {INPUT_KEY_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <SelectOption key={option.value} value={option.value}>
                {option.label}
              </SelectOption>
            ))}
          </optgroup>
        ))}
      </Select>
      <Button
        className={clsx("min-w-14 px-2 py-1.5 text-xs", {
          "bg-amber-700 hover:bg-amber-600": isBinding,
        })}
        buttonStyle={{ variant: isBinding ? "no-color" : "normal" }}
        onClick={handleBind}
      >
        {isBinding ? countdown : "Bind"}
      </Button>
      {isBinding &&
        createPortal(
          <div className="fixed inset-0 z-[9999] cursor-crosshair" />,
          document.body,
        )}
    </div>
  );
}
