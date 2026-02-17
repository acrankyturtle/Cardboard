import { Tooltip } from "./Tooltip.tsx";
import { HelpIcon } from "../assets/sharedIcons.tsx";
import clsx from "clsx";

export function HelpLink({
  section,
  tooltip,
  size = "small",
}: {
  section: string;
  tooltip?: string;
  size?: "small" | "medium";
}) {
  return (
    <Tooltip content={tooltip ?? "Help"}>
      <a
        href={`/guide#${section}`}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "flex items-center justify-center text-stone-400 hover:text-stone-300",
          {
            "size-5": size === "small",
            "size-6": size === "medium",
          },
        )}
      >
        <HelpIcon />
      </a>
    </Tooltip>
  );
}
