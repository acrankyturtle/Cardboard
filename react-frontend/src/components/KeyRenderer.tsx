import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { KeyInfo } from "../api/devices";
import clsx from "clsx";

export function KeyRenderer({
  className,
  keys,
  renderKey,
  ...props
}: {
  className?: string;
  keys: readonly KeyInfo[];
  renderKey?: (
    key: KeyInfo,
    keyClassName: string,
    style: CSSProperties,
  ) => ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [keyOffset, setKeyOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();

      // get bounds of keys
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

      const keyRect = {
        x: minX,
        y: minY,
        width: keysWidth,
        height: keysHeight,
      };

      const keyCenterX = keyRect.x + keysWidth / 2;
      const keyCenterY = keyRect.y + keysHeight / 2;

      setKeyOffset({ x: keyCenterX, y: keyCenterY });

      const pxPadding = 4;
      const scaleX = (rect.width - pxPadding) / keysWidth;
      const scaleY = (rect.height - pxPadding) / keysHeight;
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [keys]);

  // Convert units (100u = 1 key) to pixels with scaling
  const unitToPx = (u: number) => u * scale;
  const xformPosX = (x: number) => unitToPx(x) - unitToPx(keyOffset.x);
  const xformPosY = (y: number) => unitToPx(y) - unitToPx(keyOffset.y);

  const keyClassName = "absolute -translate-x-1/2 -translate-y-1/2 transform";

  return (
    <div
      ref={containerRef}
      className={clsx("relative grow overflow-hidden", className)}
      {...props}
    >
      {keys.map((key) => {
        const style: CSSProperties = {
          left: `calc(50% + ${xformPosX(key.offset.x)}px)`,
          top: `calc(50% + ${xformPosY(key.offset.y)}px)`,
          width: `${unitToPx(key.size.width)}px`,
          height: `${unitToPx(key.size.height)}px`,
        };
        return renderKey ? (
          renderKey(key, keyClassName, style)
        ) : (
          <button
            key={key.keyId}
            className={keyClassName}
            style={style}
            type="button"
          >
            {key.name}
          </button>
        );
      })}
    </div>
  );
}
