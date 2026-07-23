import Link from "next/link";
import type { ReactNode } from "react";
import { AdminDailyChart } from "@/components/admin/AdminCharts";
import {
  FEEDBACK_TYPE_LABELS,
  type AdminFeedbackItem,
} from "@/lib/admin-feedback";
import styles from "./AdminExperience.module.css";

interface AdminMetric {
  label: string;
  value: number;
}

interface AdminAttentionItem {
  detail: string;
  href: string;
  label: string;
  value: number;
}

interface AdminRecentUser {
  createdAt: string;
  displayName: string;
  email: string | null;
  username: string;
}

interface AdminRecentPage {
  createdAt: string;
  name: string;
  slug: string;
  views: number;
}

interface AdminActivityItem {
  createdAt: string;
  eventName: string;
}

interface AdminSignalDeskProps {
  attention: AdminAttentionItem[];
  dailySignups: Array<{ date: string; count: number }>;
  dailyViews: Array<{ date: string; count: number }>;
  latestFeedback: AdminFeedbackItem[];
  metrics: AdminMetric[];
  recentActivity: AdminActivityItem[];
  recentPages: AdminRecentPage[];
  recentUsers: AdminRecentUser[];
}

const EVENT_LABELS: Record<string, string> = {
  "feedback.submitted": "Feedback received",
  "page.publish.succeeded": "A Living Page was published",
  "page.publish.failed": "A page publish failed",
  "auth.callback.succeeded": "A sign-in completed",
  "auth.callback.failed": "A sign-in failed",
  "billing.webhook.failed": "A billing update failed",
  "security.rate_limit.blocked": "A request was rate limited",
};

function formatEventName(eventName: string) {
  if (EVENT_LABELS[eventName]) {
    return EVENT_LABELS[eventName];
  }

  return eventName
    .split(/[._]/)
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}` : part,
    )
    .join(" ");
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function SmallListPanel({
  children,
  href,
  title,
}: {
  children: ReactNode;
  href: string;
  title: string;
}) {
  return (
    <section className="site-panel overflow-hidden">
      <div className={styles.panelHeader}>
        <h2 className="site-panel-title">{title}</h2>
        <Link href={href} className="text-xs font-semibold text-site-action">
          View all
        </Link>
      </div>
      <div className="divide-y divide-site-border">{children}</div>
    </section>
  );
}

export default function AdminSignalDesk({
  attention,
  dailySignups,
  dailyViews,
  latestFeedback,
  metrics,
  recentActivity,
  recentPages,
  recentUsers,
}: AdminSignalDeskProps) {
  return (
    <main className={styles.page} data-admin-signal-desk>
      <header className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <p className="site-eyebrow">Owner control room</p>
          <h1 className="site-page-title mt-2">Start with what needs attention.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-site-secondary sm:text-base">
            Read user feedback, check failed actions, and review unusual accounts
            before looking at overall growth.
          </p>
        </div>
        <span className="site-badge site-badge-success">Current snapshot</span>
      </header>

      <section className={styles.hero} aria-labelledby="admin-attention-title">
        <div className={styles.heroLead}>
          <p className="site-eyebrow">Recent signals</p>
          <h2 id="admin-attention-title" className="site-section-title mt-3 max-w-xl">
            Review feedback, failed actions, and unusual accounts.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-site-secondary">
            Each number links to the people, messages, or failures behind it. Start
            there, then use the totals and trends below for context.
          </p>
          <Link href="/admin/feedback" className="site-button site-button-primary mt-6">
            Open feedback inbox
          </Link>
        </div>

        <div className={styles.heroReadout}>
          {attention.map((item) => (
            <Link key={item.label} href={item.href} className={styles.heroReadoutRow}>
              <span>
                <span className="site-eyebrow">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-site-muted">
                  {item.detail}
                </span>
              </span>
              <strong>{item.value.toLocaleString()}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.metricStrip} aria-label="Platform totals">
        {metrics.map((metric) => (
          <div key={metric.label} className={styles.metric}>
            <p className={styles.metricValue}>{metric.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-site-muted">{metric.label}</p>
          </div>
        ))}
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.feedbackLane}>
          <div className={styles.panelHeader}>
            <div>
              <p className="site-eyebrow">Latest feedback</p>
              <h2 className="site-panel-title mt-2">What users said most recently</h2>
            </div>
            <Link href="/admin/feedback" className="text-xs font-semibold text-site-action">
              Open inbox
            </Link>
          </div>

          {latestFeedback.length ? (
            <div className={styles.feedbackPreview}>
              {latestFeedback.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/feedback#${item.id}`}
                  className={styles.feedbackPreviewItem}
                >
                  <div className={styles.feedbackMeta}>
                    <span className="font-semibold text-site-text">
                      {item.sender.displayName}
                    </span>
                    <span className="site-badge py-0.5 text-[10px]">
                      {FEEDBACK_TYPE_LABELS[item.type]}
                    </span>
                    <time dateTime={item.createdAt}>{formatShortDate(item.createdAt)}</time>
                    {item.page ? <span className="font-mono">{item.page}</span> : null}
                  </div>
                  <p className={styles.feedbackMessage}>{item.message}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              No feedback has arrived yet. Signed-in users can send it from the app.
            </div>
          )}
        </section>

        <section className="site-panel overflow-hidden">
          <div className={styles.panelHeader}>
            <div>
              <p className="site-eyebrow">Activity ledger</p>
              <h2 className="site-panel-title mt-2">Recent product events</h2>
            </div>
            <Link href="/admin/ops" className="text-xs font-semibold text-site-action">
              System health
            </Link>
          </div>
          <div className="divide-y divide-site-border">
            {recentActivity.length ? (
              recentActivity.map((item, index) => (
                <div
                  key={`${item.createdAt}-${item.eventName}-${index}`}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <p className="text-xs leading-5 text-site-secondary">
                    {formatEventName(item.eventName)}
                  </p>
                  <time
                    dateTime={item.createdAt}
                    className="shrink-0 font-mono text-[10px] text-site-muted"
                  >
                    {formatShortDate(item.createdAt)}
                  </time>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-site-muted">No recent activity.</p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-4 grid gap-4 md:grid-cols-2" aria-label="Thirty-day trends">
        <AdminDailyChart title="Signups — last 30 days" dailyData={dailySignups} />
        <AdminDailyChart title="Page views — last 30 days" dailyData={dailyViews} />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <SmallListPanel href="/admin/users" title="Newest users">
          {recentUsers.length ? (
            recentUsers.map((user) => (
              <div
                key={user.username}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-site-text">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs text-site-muted">
                    {user.email ?? `@${user.username}`}
                  </p>
                </div>
                <time
                  dateTime={user.createdAt}
                  className="shrink-0 font-mono text-[10px] text-site-muted"
                >
                  {formatShortDate(user.createdAt)}
                </time>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-site-muted">No users yet.</p>
          )}
        </SmallListPanel>

        <SmallListPanel href="/admin/pages" title="Newest pages">
          {recentPages.length ? (
            recentPages.map((page) => (
              <div
                key={page.slug}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-site-text">{page.name}</p>
                  <p className="truncate font-mono text-[10px] text-site-muted">/{page.slug}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs text-site-action">{page.views} views</p>
                  <time
                    dateTime={page.createdAt}
                    className="font-mono text-[10px] text-site-muted"
                  >
                    {formatShortDate(page.createdAt)}
                  </time>
                </div>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-site-muted">No pages yet.</p>
          )}
        </SmallListPanel>
      </section>
    </main>
  );
}
