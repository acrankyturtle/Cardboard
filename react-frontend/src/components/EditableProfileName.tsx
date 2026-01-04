import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { EditIcon } from "../assets/sharedIcons.tsx";

export function EditableProfileName({
  name,
  fallback,
  onChange,
  className,
}: {
  name: string;
  fallback: string;
  onChange: (newName: string) => void;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

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
          "rounded border border-stone-600 bg-stone-800 px-2 py-0.5 text-lg font-normal text-stone-100 outline-none focus:border-violet-500",
          className,
        )}
        placeholder={fallback}
      />
    );
  }

  return (
    <div className={clsx("flex items-center gap-1", className)}>
      <span className="text-lg font-normal">{displayName}</span>
      <button
        type="button"
        onClick={() => {
          setEditValue(name);
          setIsEditing(true);
        }}
        className="rounded p-1 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
        title="Edit profile name"
      >
        <EditIcon className="size-4" />
      </button>
    </div>
  );
}
