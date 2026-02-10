import { ReactElement, ReactNode } from "react";
import { Tooltip as BaseTooltip } from "@base-ui-components/react/tooltip";

export function Tooltip({
  content,
  side = "top",
  children,
}: {
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement<Record<string, unknown>>;
}) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6}>
          <BaseTooltip.Popup className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-100 shadow-lg shadow-black/15">
            <BaseTooltip.Arrow className="fill-stone-900" />
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
