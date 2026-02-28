"use client";

import { useState } from "react";
import type { ResumeData } from "@/types/resume";

interface DownloadResumeButtonProps {
  data: ResumeData;
}

export default function DownloadResumeButton({ data }: DownloadResumeButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { default: ResumePDFDocument } = await import(
        "@/lib/pdf/ResumePDFDocument"
      );
      const blob = await pdf(<ResumePDFDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data.name || "resume").replace(/\s+/g, "-").toLowerCase()}-resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail — PDF generation is non-critical
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <button
        type="button"
        onClick={handleDownload}
        disabled={generating}
        className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(10,22,40,0.85)] px-4 py-2.5 text-[13px] sm:text-sm text-[rgba(240,244,255,0.7)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:text-[#93C5FD] hover:shadow-[0_8px_24px_rgba(59,130,246,0.2)] disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {generating ? (
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
        )}
        <span>{generating ? "Generating..." : "Download PDF"}</span>
      </button>
    </div>
  );
}
