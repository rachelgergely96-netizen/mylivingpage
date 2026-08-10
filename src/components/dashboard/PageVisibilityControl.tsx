"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PAGE_VISIBILITY_COPY,
  PAGE_VISIBILITY_STATES,
  PAGE_VISIBILITY_WRITES,
  type PageVisibilityState,
} from "@/lib/page-visibility";

interface PageVisibilityControlProps {
  pageId: string;
  slug: string;
  initialState: PageVisibilityState;
}

export default function PageVisibilityControl({
  pageId,
  slug,
  initialState,
}: PageVisibilityControlProps) {
  const router = useRouter();
  const [state, setState] = useState<PageVisibilityState>(initialState);
  const [savingState, setSavingState] = useState<PageVisibilityState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const announce = useCallback((message: string) => {
    setStatus(message);
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setStatus(null);
      statusTimerRef.current = null;
    }, 4000);
  }, []);

  const choose = useCallback(
    async (next: PageVisibilityState) => {
      if (next === state || savingState) {
        return;
      }

      setSavingState(next);
      setError(null);

      try {
        const response = await fetch(`/api/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(PAGE_VISIBILITY_WRITES[next]),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? "Unable to change page visibility.");
        }

        setState(next);
        announce(`Your page is now ${PAGE_VISIBILITY_COPY[next].label.toLowerCase()}.`);
        router.refresh();
      } catch (visibilityError) {
        setError(
          visibilityError instanceof Error
            ? visibilityError.message
            : "Unable to change page visibility.",
        );
      } finally {
        setSavingState(null);
      }
    },
    [announce, pageId, router, savingState, state],
  );

  return (
    <section id="visibility" className="site-panel mb-5 scroll-mt-24 p-5 sm:p-7">
      <h2 className="site-panel-title mb-1.5">Page visibility</h2>
      <p className="mb-5 max-w-2xl text-sm leading-6 text-site-secondary">
        Your address <span className="font-mono text-site-action">mylivingpage.com/{slug}</span> stays
        reserved in every state, and nothing you have written is deleted.
      </p>

      <fieldset>
        <legend className="sr-only">Choose who can see your page</legend>
        <div className="space-y-2">
          {PAGE_VISIBILITY_STATES.map((option) => {
            const copy = PAGE_VISIBILITY_COPY[option];
            const active = state === option;
            const busy = savingState === option;

            return (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                  active
                    ? "border-site-action bg-site-selected"
                    : "border-site-border bg-site-canvas-alt hover:border-site-border-strong"
                } ${savingState ? "opacity-70" : ""}`}
              >
                <input
                  type="radio"
                  name="page-visibility"
                  value={option}
                  checked={active}
                  disabled={Boolean(savingState)}
                  onChange={() => void choose(option)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--site-action)]"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-site-text">{copy.label}</span>
                    {active ? (
                      <span className="site-badge site-badge-success">Current</span>
                    ) : null}
                    {busy ? (
                      <span className="text-xs text-site-muted">Saving…</span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-site-muted">
                    {copy.summary}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {state === "offline" ? (
        <p className="site-callout mt-4 p-3 text-xs leading-5">
          Your page is offline. Visitors see a short note that it is unavailable, and your
          analytics keep everything recorded so far.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-site-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="sr-only" role="status">
        {status ?? ""}
      </p>
    </section>
  );
}
