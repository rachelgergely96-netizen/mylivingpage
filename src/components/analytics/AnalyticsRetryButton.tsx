"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function AnalyticsRetryButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="site-button site-button-secondary px-5"
    >
      Try again
    </button>
  );
}
