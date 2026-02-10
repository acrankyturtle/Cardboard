import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { EditIcon } from "../assets/sharedIcons.tsx";
import { InputClassName } from "./Input.tsx";
import { getButtonClassName } from "./Button.tsx";
import { Tooltip } from "./Tooltip.tsx";

export function EditableProfileName({
  name,
  fallback,
  onChange,
  onEditing,
  className,
}: {
  name: string;
  fallback: string;
  onChange: (newName: string) => void;
  onEditing?: (isEditing: boolean) => void;
  className?: string;
}) {
  const [isEditing, setStateIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const setIsEditing = (editing: boolean) => {
    setStateIsEditing(editing);
    onEditing?.(editing);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    onChange(trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const displayName = name || fallback;

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={clsx(
          InputClassName,
          "py-0.5 text-lg font-normal",
          className,
        )}
        placeholder={fallback}
      />
    );
  }

  return (
    <div className={clsx("flex items-center gap-1", className)}>
      <span className="text-lg font-normal">{displayName}</span>
      <Tooltip content="Edit profile name">
        <button
          type="button"
          onClick={() => {
            setEditValue(name);
            setIsEditing(true);
          }}
          className={clsx(
            getButtonClassName({ variant: "ghost", padding: "none" }),
            "p-1",
          )}
        >
          <EditIcon className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}
