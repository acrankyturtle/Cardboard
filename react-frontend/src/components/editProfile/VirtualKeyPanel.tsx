import clsx from "clsx";
import { useMemo } from "react";
import { KeyColor } from "../../api/devices.ts";
import {
  getVirtualKeyId,
  useEditDeviceContext,
} from "../../lib/editDeviceContext.tsx";
import { Key } from "./Key.tsx";

export function VirtualKeyPanel({ className }: { className?: string }) {
  const { state } = useEditDeviceContext();
  const device = state.device;
  const vks = useMemo(
    () =>
      Array.from({ length: device.virtualKeyCount }, (_, i) => {
        return {
          keyId: getVirtualKeyId(i),
          name: `${i + 1}`,

          layers: state.profile.virtualKeys[i]?.layers,
        };
      }).filter((vk) => vk),
    [state, device],
  );
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 rounded-2xl bg-stone-900 px-4 py-3",
        className,
      )}
    >
      <div>Virtual Keys</div>
      <div className="flex max-h-40 flex-wrap justify-center overflow-y-auto">
        {vks.map((vk) => (
          <Key
            key={vk.keyId}
            keyId={vk.keyId}
            keyName={vk.name}
            keyColor={KeyColor.Virtual}
            keyClassName="size-13"
            compact
          />
        ))}
      </div>
    </div>
  );
}
