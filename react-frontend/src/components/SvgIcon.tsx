import DOMPurify from "dompurify";
import { HTMLAttributes, useEffect, useState } from "react";
import { getAssetUrl } from "../api/cardboardApi.ts";

type SvgIconProps = { url: string } & HTMLAttributes<HTMLDivElement>;

function sanitizeSvg(raw: string): string {
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
  });
}

export function SvgIcon({ url, ...divProps }: SvgIconProps) {
  const [svgHtml, setSvgHtml] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(getAssetUrl(url), { signal: controller.signal })
      .then((r) => r.text())
      .then((text) => setSvgHtml(sanitizeSvg(text)))
      .catch(() => {});
    return () => controller.abort();
  }, [url]);

  return <div {...divProps} dangerouslySetInnerHTML={{ __html: svgHtml }} />;
}
