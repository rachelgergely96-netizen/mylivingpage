"use client";

import { useState } from "react";

type FeedbackType = "bug" | "feature" | "general";

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  general: "General",
};

export default function FeedbackWidget() {
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

  const handleClose = () => {
    setOpen(false);
    setMessage("");
    setType("general");
    setStatus("idle");
    setError("");
  };

  const handleSubmit = async () => {
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
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send feedback");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(10,22,40,0.92)] p-4 shadow-2xl backdrop-blur-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)]">
            Send Feedback
          </p>

          {status === "success" ? (
            <p className="py-4 text-center text-sm text-[#3B82F6]">Thanks for your feedback!</p>
          ) : (
            <>
              {/* Type selector */}
              <div className="mb-3 flex gap-1.5">
                {(["bug", "feature", "general"] as FeedbackType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 rounded-full py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                      type === t
                        ? "bg-[#3B82F6] text-white"
                        : "border border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.5)] hover:text-[rgba(240,244,255,0.8)]"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share a thought, bug report, or request..."
                maxLength={2000}
                rows={4}
                className="w-full resize-none rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] p-3 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none"
              />
              <p className="mt-1 text-right text-[10px] text-[rgba(240,244,255,0.25)]">
                {message.length}/2000
              </p>

              {error && (
                <p className="mt-1 text-xs text-[#ff8e8e]">{error}</p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-full border border-[rgba(255,255,255,0.12)] py-2 text-xs text-[rgba(240,244,255,0.55)] transition-colors hover:text-[rgba(240,244,255,0.8)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={status === "loading" || !message.trim()}
                  className="flex-1 rounded-full bg-[#3B82F6] py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {status === "loading" ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={open ? handleClose : handleOpen}
        className="rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(10,22,40,0.85)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.6)] shadow-lg backdrop-blur-xl transition-colors hover:border-[rgba(59,130,246,0.4)] hover:text-[#93C5FD]"
      >
        {open ? "Close" : "Feedback"}
      </button>
    </div>
  );
}
