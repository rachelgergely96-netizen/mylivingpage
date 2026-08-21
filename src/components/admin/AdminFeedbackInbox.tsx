"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { MOTION_MODE_POLICIES } from "@/lib/motion";
import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";
import {
  FEEDBACK_TYPE_LABELS,
  countFeedbackByType,
  type AdminFeedbackItem,
  type FeedbackType,
} from "@/lib/admin-feedback";
import styles from "./AdminExperience.module.css";

type FeedbackFilter = "all" | FeedbackType;

interface AdminFeedbackInboxProps {
  items: AdminFeedbackItem[];
}

const TYPE_BADGE_CLASSES: Record<FeedbackType, string> = {
  bug: "site-badge-danger",
  feature: "border-site-action bg-site-selected text-site-action-hover",
  general: "",
};

function formatFeedbackDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
}

function feedbackMatchesQuery(item: AdminFeedbackItem, query: string) {
  if (!query) {
    return true;
  }

  const searchable = [
    item.message,
    item.page,
    item.sender.displayName,
    item.sender.username,
    item.sender.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

export default function AdminFeedbackInbox({ items }: AdminFeedbackInboxProps) {
  const { mode: motionMode } = useMotionPreference();
  const allowsSmoothScroll =
    MOTION_MODE_POLICIES[motionMode].allowsSmoothScroll;
  const [filter, setFilter] = useState<FeedbackFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const detailRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const counts = useMemo(() => countFeedbackByType(items), [items]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (filter === "all" || item.type === filter) &&
          feedbackMatchesQuery(item, deferredQuery),
      ),
    [deferredQuery, filter, items],
  );

  const selected =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const selectedPage = sanitizeInternalRedirectPath(selected?.page, "");

  const selectItem = (id: string, revealDetail = false) => {
    setSelectedId(id);
    if (revealDetail && window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({
          behavior: allowsSmoothScroll ? "smooth" : "auto",
          block: "start",
        });
      });
    }
  };

  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    itemIndex: number,
  ) => {
    let nextIndex = itemIndex;
    if (event.key === "ArrowDown") {
      nextIndex = Math.min(itemIndex + 1, filteredItems.length - 1);
    } else if (event.key === "ArrowUp") {
      nextIndex = Math.max(itemIndex - 1, 0);
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = filteredItems.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextItem = filteredItems[nextIndex];
    if (!nextItem) {
      return;
    }
    setSelectedId(nextItem.id);
    window.requestAnimationFrame(() => itemRefs.current.get(nextItem.id)?.focus());
  };

  useEffect(() => {
    let requestedId = "";
    try {
      requestedId = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }

    if (items.some((item) => item.id === requestedId)) {
      setSelectedId(requestedId);
    }
  }, [items]);

  const filters: Array<{ id: FeedbackFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: items.length },
    { id: "bug", label: "Bugs", count: counts.bug },
    { id: "feature", label: "Ideas", count: counts.feature },
    { id: "general", label: "Notes", count: counts.general },
  ];

  return (
    <div className={styles.inboxLayout} data-admin-feedback-inbox>
      <div className={styles.inboxControls}>
        <div className={styles.filterGrid}>
          <div>
            <label htmlFor="admin-feedback-search" className="site-eyebrow">
              Find feedback
            </label>
            <input
              id="admin-feedback-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search message, person, email, or page"
              className="site-field mt-2 w-full px-3"
            />
          </div>
          <div
            className={styles.filterTabs}
            role="group"
            aria-label="Filter feedback by type"
          >
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.filterTab}
                data-active={filter === item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label} <span className="font-mono">({item.count})</span>
              </button>
            ))}
          </div>
          <a href="#admin-feedback-detail" className="sr-only focus:not-sr-only">
            Skip to selected feedback
          </a>
        </div>
      </div>

      {filteredItems.length ? (
        <>
          <div
            className={styles.inboxList}
            role="listbox"
            aria-label="Feedback messages"
          >
            {filteredItems.map((item, itemIndex) => {
              const active = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  id={item.id}
                  ref={(element) => {
                    if (element) {
                      itemRefs.current.set(item.id, element);
                    } else {
                      itemRefs.current.delete(item.id);
                    }
                  }}
                  type="button"
                  role="option"
                  className={styles.inboxItem}
                  data-active={active}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectItem(item.id, true)}
                  onKeyDown={(event) => handleItemKeyDown(event, itemIndex)}
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-xs text-site-text">
                        {item.sender.displayName}
                      </strong>
                      <span
                        className={`site-badge py-0.5 text-xs ${TYPE_BADGE_CLASSES[item.type]}`}
                      >
                        {FEEDBACK_TYPE_LABELS[item.type]}
                      </span>
                    </span>
                    <span className={`${styles.inboxItemMessage} mt-2`}>
                      {item.message}
                    </span>
                    {item.page ? (
                      <span className="mt-2 block truncate font-mono text-xs text-site-muted">
                        {item.page}
                      </span>
                    ) : null}
                  </span>
                  <time
                    dateTime={item.createdAt}
                    className="shrink-0 font-mono text-xs text-site-muted"
                  >
                    {new Date(item.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "America/New_York",
                    })}
                  </time>
                </button>
              );
            })}
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {selected ? `Selected feedback from ${selected.sender.displayName}.` : ""}
          </p>
          <article
            ref={detailRef}
            id="admin-feedback-detail"
            className={styles.inboxDetail}
            aria-labelledby="admin-feedback-detail-title"
            tabIndex={-1}
          >
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="site-eyebrow">Feedback detail</p>
                    <h2 id="admin-feedback-detail-title" className="site-section-title mt-2">
                      {selected.sender.displayName}
                    </h2>
                    <p className="mt-2 text-sm text-site-muted">
                      {selected.sender.username ? `@${selected.sender.username}` : "Signed-in user"}
                    </p>
                  </div>
                  <span
                    className={`site-badge ${TYPE_BADGE_CLASSES[selected.type]}`}
                  >
                    {FEEDBACK_TYPE_LABELS[selected.type]}
                  </span>
                </div>

                <p className={styles.detailMessage}>{selected.message}</p>

                <dl className={styles.detailFacts}>
                  <div className={styles.detailFact}>
                    <dt className="site-eyebrow">Received</dt>
                    <dd className="mt-2 text-sm text-site-secondary">
                      <time dateTime={selected.createdAt}>
                        {formatFeedbackDate(selected.createdAt)}
                      </time>
                    </dd>
                  </div>
                  <div className={styles.detailFact}>
                    <dt className="site-eyebrow">Email</dt>
                    <dd className="mt-2 truncate text-sm text-site-secondary">
                      {selected.sender.email ?? "No email available"}
                    </dd>
                  </div>
                  <div className={styles.detailFact}>
                    <dt className="site-eyebrow">Sent from</dt>
                    <dd className="mt-2 truncate font-mono text-xs text-site-secondary">
                      {selected.page ?? "Page not recorded"}
                    </dd>
                  </div>
                  <div className={styles.detailFact}>
                    <dt className="site-eyebrow">Account</dt>
                    <dd className="mt-2 text-sm text-site-secondary">
                      {selected.userId ? "Signed in" : "Account no longer available"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-3">
                  {selected.sender.email ? (
                    <a
                      href={`mailto:${selected.sender.email}?subject=${encodeURIComponent("Your MyLivingPage feedback")}`}
                      className="site-button site-button-primary"
                    >
                      Email this user
                    </a>
                  ) : null}
                  {selectedPage ? (
                    <Link
                      href={selectedPage}
                      className="site-button site-button-secondary"
                    >
                      Open same app screen
                    </Link>
                  ) : null}
                  <Link href="/admin/users" className="site-button site-button-secondary">
                      Go to users
                  </Link>
                </div>
              </>
            ) : null}
          </article>
        </>
      ) : (
        <div className={`${styles.emptyState} lg:col-span-2`}>
          <p className="site-panel-title">No feedback matches this view.</p>
          <p className="mt-2 text-sm">
            Clear the search or choose another feedback type.
          </p>
        </div>
      )}
    </div>
  );
}
