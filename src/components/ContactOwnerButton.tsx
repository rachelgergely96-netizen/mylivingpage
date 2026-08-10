"use client";

import type { ResumeData } from "@/types/resume";

interface ContactOwnerButtonProps {
  resumeData: ResumeData;
  className?: string;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * The dock is the one element pinned in view for the whole scroll, and until now
 * it only offered a PDF and a share card. A reader who was convinced had no
 * action to take — contact details were passive chips in the résumé header.
 *
 * Carries the same `data-analytics-target-key="email"` the header links use, so
 * contact intent lands in the existing conversion metrics and per-variant
 * attribution rather than needing a new event.
 */
export default function ContactOwnerButton({
  resumeData,
  className,
}: ContactOwnerButtonProps) {
  const email = resumeData.email?.trim();
  if (!email) {
    return null;
  }

  const name = firstName(resumeData.name);
  const subject = name ? `Reaching out after your page, ${name}` : "Reaching out";
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

  return (
    <a
      href={href}
      data-analytics-target-key="email"
      data-analytics-target-label={email}
      className={`site-button site-button-primary ${className ?? ""}`}
    >
      <svg
        className="mr-2 h-4 w-4 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="1.75" y="3.25" width="12.5" height="9.5" />
        <path d="M1.75 4.5 8 8.75l6.25-4.25" />
      </svg>
      {name ? `Get in touch with ${name}` : "Get in touch"}
    </a>
  );
}
