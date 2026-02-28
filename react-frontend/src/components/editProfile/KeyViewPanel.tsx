import { useEditDeviceContext } from "../../lib/editDeviceContext.tsx";
import { KeyRenderer } from "../KeyRenderer.tsx";
import { Key } from "./Key.tsx";

export function KeyViewPanel({ className }: { className?: string }) {
  const { state } = useEditDeviceContext();
  const device = state.device;
  return (
    <KeyRenderer
      className={className}
      keys={device.keyMap}
      renderKey={(key, keyClassName, style) => {
        return (
          <Key
            key={key.keyId}
            keyId={key.keyId}
            keyName={key.name}
            keyColor={key.color}
            keyClassName={keyClassName}
            keyStyle={style}
          />
        );
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    />
  );
}
