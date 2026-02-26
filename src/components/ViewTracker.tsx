"use client";

import { useEffect } from "react";

interface ViewTrackerProps {
  pageId: string;
}

export default function ViewTracker({ pageId }: ViewTrackerProps) {
  useEffect(() => {
    void fetch("/api/pages/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pageId }),
    });
  }, [pageId]);

  return null;
}
