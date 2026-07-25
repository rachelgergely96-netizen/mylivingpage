"use client";

import { useEffect, useRef, useState } from "react";
import {
  ShareCardArtwork,
  type ShareCardArtworkProps,
} from "@/components/ShareCardArtwork";
import { SHARE_CARD_SIZE } from "@/lib/share-card";

interface ScaledShareCardArtworkProps extends ShareCardArtworkProps {
  frameClassName?: string;
  testId?: string;
}

export function ScaledShareCardArtwork({
  frameClassName,
  testId,
  ...artworkProps
}: ScaledShareCardArtworkProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateScale = () => {
      setScale(frame.getBoundingClientRect().width / SHARE_CARD_SIZE.width);
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    updateScale();

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={frameClassName}
      data-scaled-share-card
      data-testid={testId}
      style={{
        aspectRatio: `${SHARE_CARD_SIZE.width} / ${SHARE_CARD_SIZE.height}`,
        contain: "layout paint",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          height: SHARE_CARD_SIZE.height,
          left: 0,
          opacity: scale > 0 ? 1 : 0,
          position: "absolute",
          top: 0,
          transform: `scale(${scale || 1})`,
          transformOrigin: "top left",
          willChange: scale > 0 ? "transform" : "auto",
          width: SHARE_CARD_SIZE.width,
        }}
      >
        <ShareCardArtwork {...artworkProps} />
      </div>
    </div>
  );
}
