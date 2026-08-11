"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PAGE_VISIBILITY_WRITES,
  type PageVisibilityState,
} from "@/lib/page-visibility";

interface PublishPageButtonProps {
  pageId: string;
  emphasis?: "primary" | "secondary";
  label?: string;
  /**
   * Which live state to restore. A page that was link-only before going
   * offline must not come back searchable just because it was republished —
   * that is the one thing the person who chose link-only was avoiding.
   */
  publishAs?: Extract<PageVisibilityState, "public" | "link">;
  onPublished?: (state: Extract<PageVisibilityState, "public" | "link">) => void;
}

export default function PublishPageButton({
  pageId,
  emphasis = "primary",
  label = "Publish",
  publishAs = "public",
  onPublished,
}: PublishPageButtonProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = publishing || isPending;

  const publishPage = async () => {
    if (busy) {
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(PAGE_VISIBILITY_WRITES[publishAs]),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to publish this page.");
      }

      onPublished?.(publishAs);
      startTransition(() => {
        router.refresh();
      });
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish this page.",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() => void publishPage()}
        className={`site-button ${
          emphasis === "secondary" ? "site-button-secondary" : "site-button-primary"
        } w-full disabled:opacity-50 sm:w-auto`}
      >
        <span className="grid">
          <span
            aria-hidden={busy || undefined}
            className={`col-start-1 row-start-1 ${busy ? "invisible" : ""}`}
          >
            {label}
          </span>
          <span
            aria-hidden={!busy || undefined}
            className={`col-start-1 row-start-1 ${busy ? "" : "invisible"}`}
          >
            Publishing…
          </span>
        </span>
      </button>
      {error ? (
        <p
          role="alert"
          className="site-alert-danger mt-2 flex items-start gap-2 px-3 py-2 text-xs leading-5"
        >
          <svg
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.75v3.75" strokeLinecap="square" />
            <path d="M8 11.25h.01" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
