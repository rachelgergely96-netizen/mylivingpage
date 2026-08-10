"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationPreferenceState {
  first_view_email: boolean;
  repeat_visitor_email: boolean;
  weekly_digest_email: boolean;
}

type PreferenceKey = keyof NotificationPreferenceState;

const TOGGLES: Array<{
  key: PreferenceKey;
  label: string;
  description: string;
}> = [
  {
    key: "first_view_email",
    label: "When someone opens your page",
    description:
      "Sent once per person, and only after they actually read — a link scanner opening your page in transit will not trigger it.",
  },
  {
    key: "repeat_visitor_email",
    label: "When someone comes back",
    description:
      "A second visit is usually the one worth acting on.",
  },
  {
    key: "weekly_digest_email",
    label: "Weekly summary",
    description: "Monday morning recap of views, repeat visitors, and link clicks.",
  },
];

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferenceState | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/notifications/preferences")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("load_failed");
        }
        return (await response.json()) as NotificationPreferenceState;
      })
      .then((data) => {
        if (!cancelled) {
          setPreferences(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    },
    [],
  );

  const announce = useCallback((message: string) => {
    setStatus(message);
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setStatus(null);
      statusTimerRef.current = null;
    }, 3000);
  }, []);

  const toggle = useCallback(
    async (key: PreferenceKey) => {
      if (!preferences || savingKey) {
        return;
      }

      const nextValue = !preferences[key];
      const previous = preferences;

      // Optimistic: a settings toggle that lags behind the pointer reads as broken.
      setPreferences({ ...preferences, [key]: nextValue });
      setSavingKey(key);

      try {
        const response = await fetch("/api/notifications/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: nextValue }),
        });

        if (!response.ok) {
          throw new Error("save_failed");
        }

        setPreferences((await response.json()) as NotificationPreferenceState);
        announce(nextValue ? "Turned on." : "Turned off.");
      } catch {
        setPreferences(previous);
        announce("That did not save. Try again.");
      } finally {
        setSavingKey(null);
      }
    },
    [announce, preferences, savingKey],
  );

  return (
    <section id="notifications" className="site-panel mb-5 scroll-mt-24 p-5 sm:p-7">
      <h2 className="site-panel-title mb-1.5">Email notifications</h2>
      <p className="mb-5 max-w-2xl text-sm leading-6 text-site-secondary">
        Your page tracks every view either way — these control what reaches your inbox.
      </p>

      {loading ? (
        <p className="text-sm text-site-muted" role="status">
          Loading notification settings…
        </p>
      ) : loadError || !preferences ? (
        <p className="text-sm text-site-danger" role="alert">
          We could not load your notification settings. Refresh to try again.
        </p>
      ) : (
        <ul className="space-y-3">
          {TOGGLES.map(({ key, label, description }) => {
            const checked = preferences[key];
            return (
              <li
                key={key}
                className="flex items-start justify-between gap-4 border border-site-border bg-site-canvas-alt p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-site-text">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-site-muted">{description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={label}
                  disabled={savingKey === key}
                  onClick={() => void toggle(key)}
                  className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center border transition-colors disabled:opacity-60 ${
                    checked
                      ? "border-site-action bg-site-action"
                      : "border-site-border-strong bg-site-surface"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform ${
                      checked
                        ? "translate-x-6 bg-site-action-ink"
                        : "translate-x-1 bg-site-border-strong"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="sr-only" role="status">
        {status ?? ""}
      </p>
    </section>
  );
}
