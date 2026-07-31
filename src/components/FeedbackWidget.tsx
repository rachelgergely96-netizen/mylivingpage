"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type FeedbackType = "bug" | "feature" | "general";

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  feature: "Feature request",
  general: "General",
};

export default function FeedbackWidget() {
  const closeTimerRef = useRef<number | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleOpen = () => {
    setPage(window.location.pathname);
    setOpen(true);
  };

  const handleClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(false);
    setMessage("");
    setType("general");
    setStatus("idle");
    setError("");
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, type, page }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to send feedback");
      }

      setStatus("success");
      setMessage("");
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        handleClose();
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send feedback");
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trigger = triggerRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    messageRef.current?.focus();
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open, handleClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" data-site-ui>
      {open && (
        <div
          className="site-panel-raised w-80 max-w-[calc(100vw-2rem)] p-4"
          role="dialog"
          aria-labelledby="feedback-title"
          aria-describedby="feedback-description"
        >
          <p id="feedback-title" className="site-eyebrow mb-3">
            Send feedback
          </p>
          <p id="feedback-description" className="mb-3 text-xs leading-5 text-site-muted">
            This goes to the private MyLivingPage admin inbox.
          </p>

          {status === "success" ? (
            <p className="py-4 text-center text-sm text-site-success" role="status">Thanks for your feedback!</p>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Type selector */}
              <div className="mb-3 flex gap-1.5">
                {(["bug", "feature", "general"] as FeedbackType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    type="button"
                    aria-pressed={type === t}
                    className={`min-h-11 flex-1 rounded-none border px-2 py-2 text-xs font-semibold transition-colors ${
                      type === t
                        ? "border-site-action bg-site-selected text-site-text"
                        : "border-site-border text-site-secondary hover:border-site-border-strong hover:text-site-text"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              <label htmlFor="feedback-message" className="sr-only">Feedback message</label>
              <textarea
                ref={messageRef}
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share a thought, bug report, or request…"
                maxLength={2000}
                rows={4}
                aria-invalid={status === "error" ? true : undefined}
                aria-describedby={error ? "feedback-error" : "feedback-description"}
                className="site-field w-full resize-none p-3 text-sm"
              />
              <p className="mt-1 text-right text-xs text-site-muted">
                {message.length}/2000
              </p>

              {error && (
                <p id="feedback-error" className="mt-1 flex items-start gap-1.5 text-xs text-site-danger" role="alert">
                  <svg
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="6.5" />
                    <path d="M8 4.75v3.75" strokeLinecap="square" />
                    <path d="M8 11.25h.01" strokeLinecap="round" />
                  </svg>
                  <span>{error}</span>
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleClose}
                  type="button"
                  className="site-button site-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  disabled={status === "loading" || !message.trim()}
                  type="submit"
                  className="site-button site-button-primary flex-1 disabled:opacity-50"
                >
                  {status === "loading" ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={open ? handleClose : handleOpen}
        className="site-button site-button-secondary bg-site-surface-raised shadow-[var(--site-shadow-raised)]"
        aria-expanded={open}
      >
        {open ? "Close" : "Feedback"}
      </button>
    </div>
  );
}
