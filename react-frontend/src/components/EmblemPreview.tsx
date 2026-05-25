import clsx from "clsx";
import { ApplicationIconEmblem } from "@root/react-frontend/src/api/associations.ts";
import { Logo } from "@root/react-frontend/src/components/Logo.tsx";

export function EmblemPreview({
  emblem,
  size = 40,
  className,
}: {
  emblem: ApplicationIconEmblem;
  size?: number;
  className?: string;
}) {
  // emblem size matches backend TrayIcon.cs: 45% of the icon side
  const emblemSize = Math.round(size * 0.45);

  const cornerStyle: React.CSSProperties = (() => {
    switch (emblem.position) {
      case "TopLeft":
        return { top: 0, left: 0 };
      case "TopRight":
        return { top: 0, right: 0 };
      case "BottomLeft":
        return { bottom: 0, left: 0 };
      case "BottomRight":
        return { bottom: 0, right: 0 };
    }
  })();

  return (
    <div
      className={clsx("relative shrink-0", className)}
      style={{ width: size, height: size }}
      aria-label={`Emblem: ${emblem.shape} at ${emblem.position} in ${emblem.color}`}
    >
      <Logo className="absolute inset-0" />
      <svg
        className="absolute"
        width={emblemSize}
        height={emblemSize}
        style={cornerStyle}
      >
        <EmblemShape emblem={emblem} size={size} emblemSize={emblemSize} />
      </svg>
    </div>
  );
}

function EmblemShape({
  emblem,
  size,
  emblemSize,
}: {
  emblem: ApplicationIconEmblem;
  size: number;
  emblemSize: number;
}) {
  const strokeWidth = Math.max(1, 1 + (size - 16) / 48);
  const inset = strokeWidth / 2;
  const inner = emblemSize - strokeWidth;

  switch (emblem.shape) {
    case "Circle":
      return (
        <circle
          cx={emblemSize / 2}
          cy={emblemSize / 2}
          r={inner / 2}
          fill={emblem.color}
          stroke="black"
          strokeWidth={strokeWidth}
        />
      );
    case "Square":
      return (
        <rect
          x={inset}
          y={inset}
          width={inner}
          height={inner}
          fill={emblem.color}
          stroke="black"
          strokeWidth={strokeWidth}
        />
      );
    case "Triangle":
      return (
        <polygon
          points={`${emblemSize / 2},${inset} ${inset},${emblemSize - inset} ${emblemSize - inset},${emblemSize - inset}`}
          fill={emblem.color}
          stroke="black"
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
  }
}
