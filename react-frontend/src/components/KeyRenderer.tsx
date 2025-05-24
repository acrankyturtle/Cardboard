import { ButtonHTMLAttributes, useEffect, useRef, useState } from "react";
import { KeyInfo } from "../api/devices";
import clsx from "clsx";

export function KeyRenderer({
  className,
  keys,
  keyClassName,
  ...buttonProps
}: {
  keys: readonly KeyInfo[];
  keyClassName?: string | ((keyId: string) => string);
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const containerRect = containerRef.current.getBoundingClientRect();
      setContainerSize({
        width: containerRect.width,
        height: containerRect.height,
      });

      // Calculate bounds of keys in units
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      keys.forEach((key) => {
        const halfWidth = key.size.width / 2;
        const halfHeight = key.size.height / 2;
        minX = Math.min(minX, key.offset.x - halfWidth);
        maxX = Math.max(maxX, key.offset.x + halfWidth);
        minY = Math.min(minY, key.offset.y - halfHeight);
        maxY = Math.max(maxY, key.offset.y + halfHeight);
      });

      const keysWidth = maxX - minX;
      const keysHeight = maxY - minY;

      // Calculate scale to fit keys within 90% of viewport to avoid clipping
      const padding = 0.1; // 10% padding
      const scaleX = (viewportWidth / keysWidth) * (1 - padding);
      const scaleY = (viewportHeight / keysHeight) * (1 - padding);
      const newScale = Math.min(scaleX, scaleY);

      //setScale(newScale);

      setScale(100);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [keys]);

  // Convert units (100u = 1 key) to pixels with scaling
  const unitToPx = (u: number) => (u * scale) / 100;

  // Center of container in units
  const centerX = (containerSize.width / 2 / scale) * 100;
  const centerY = (containerSize.height / 2 / scale) * 100;

  console.log(keys);

  return (
    <div className={clsx("grow bg-stone-950", className)}></div>
    // <div
    //   ref={containerRef}
    //   className={clsx("relative h-full w-full overflow-hidden", className)}
    // >
    //   {keys.map((key) => {
    //     const className =
    //       typeof keyClassName === "function"
    //         ? keyClassName(key.keyId)
    //         : keyClassName || "bg-gray-200 hover:bg-gray-300";

    //     return (
    //       <button
    //         key={key.keyId}
    //         {...buttonProps}
    //         className={`absolute -translate-x-1/2 -translate-y-1/2 transform rounded-md transition-colors ${className} `}
    //         style={{
    //           left: `calc(50% + ${unitToPx(key.offset.x - centerX)}px)`,
    //           top: `calc(50% + ${unitToPx(key.offset.y - centerY)}px)`,
    //           width: `${unitToPx(key.size.width)}px`,
    //           height: `${unitToPx(key.size.height)}px`,
    //         }}
    //       >
    //         {key.keyId}
    //       </button>
    //     );
    //   })}
    // </div>
  );
}
