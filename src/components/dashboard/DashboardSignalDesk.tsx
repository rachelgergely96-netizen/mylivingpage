import React from "react";
import Link from "next/link";
import type { AccountAccessState, AnalyticsTier } from "@/lib/account-access";
import type { PageProofStatus, PageProofSummary } from "@/lib/analytics/proofSummary";
import { getTheme } from "@/themes/registry";
import type { PageRecord } from "@/types/resume";
import DeletePageButton from "@/components/DeletePageButton";
import PublishPageButton from "@/components/PublishPageButton";
import DashboardCopyLinkButton from "@/components/dashboard/DashboardCopyLinkButton";

export interface DashboardSignalPage {
  page: PageRecord;
  proof: PageProofSummary;
  publicViewAvailable: boolean;
}

interface DashboardSignalDeskProps {
  accountAccess: AccountAccessState;
  activePaidPlanPriceLabel: string;
  displayName: string | null;
  maxPagesPerAccount: number;
  offlineAttemptAt: string | null;
  pages: DashboardSignalPage[];
  publicSlug: string | null;
}

interface ProofPanelCopy {
  body: string;
  eyebrow: string;
  title: string;
}

type PrimaryAction =
  | { kind: "analytics"; label: string }
  | { kind: "copy"; label: string }
  | { kind: "publish"; label: string };

function formatDurationShort(seconds: number | null) {
  if (seconds === null || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (!minutes) {
    return `${remainder}s`;
  }

  if (!remainder) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainder}s`;
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return null;
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function buildProofPanelCopy(
  proof: PageProofSummary,
  analyticsTier: AnalyticsTier,
): ProofPanelCopy {
  switch (proof.status) {
    case "awaiting_views":
      return {
        eyebrow: "Signal sent",
        title: "Your link is out. The first look is the next signal.",
        body:
          "Tracking is active. Give the recipient a little time, or copy the link again for a well-timed follow-up.",
      };
    case "proof_landed":
      return {
        eyebrow: "Proof landed",
        title: "Someone looked after you shared it.",
        body:
          analyticsTier === "full"
            ? proof.firstViewAfterLatestShareAt
              ? `Your first post-share look showed up ${formatRelativeTime(proof.firstViewAfterLatestShareAt)}. Read the signal for device mix, referrers, and viewing behavior.`
              : "Your page is getting attention after a recent share. Read the signal to see what happened after the click."
            : "Your page is getting attention after a recent share. Read the signal for the deeper engagement details.",
      };
    case "active":
      return {
        eyebrow: "Live signal",
        title: `${proof.viewsLast7d} people looked in the last 7 days.`,
        body:
          analyticsTier === "full"
            ? proof.latestViewAt
              ? `Latest activity was ${formatRelativeTime(proof.latestViewAt)}. Open analytics to see whether the page is still carrying your follow-ups.`
              : "Your page is getting outside traffic. Open analytics for the full picture."
            : proof.latestViewAt
              ? `Latest activity was ${formatRelativeTime(proof.latestViewAt)}. Open analytics for the deeper engagement details.`
              : "Your page is getting outside traffic. Open analytics for the full picture.",
      };
    default:
      return {
        eyebrow: "Next signal",
        title: "Put your Living Page in front of one real person.",
        body:
          "Copy the public link and send it with your next application, recruiter reply, or warm introduction. The desk will show you when attention lands.",
      };
  }
}

export function getDashboardPrimaryAction(
  status: PageProofStatus,
  publicViewAvailable: boolean,
): PrimaryAction {
  if (!publicViewAvailable) {
    return { kind: "publish", label: "Publish page" };
  }

  if (status === "ready_to_share") {
    return { kind: "copy", label: "Copy live link" };
  }

  if (status === "awaiting_views") {
    return { kind: "copy", label: "Copy link again" };
  }

  return { kind: "analytics", label: "Read the signal" };
}

function DashboardPrimaryAction({
  action,
  analyticsHref,
  livePath,
  pageId,
}: {
  action: PrimaryAction;
  analyticsHref: string;
  livePath: string;
  pageId: string;
}) {
  if (action.kind === "publish") {
    return (
      <PublishPageButton
        pageId={pageId}
        emphasis="primary"
        label={action.label}
      />
    );
  }

  if (action.kind === "copy") {
    return (
      <DashboardCopyLinkButton
        label={action.label}
        livePath={livePath}
        pageId={pageId}
      />
    );
  }

  return (
    <Link href={analyticsHref} className="site-button site-button-primary w-full sm:w-auto">
      {action.label}
    </Link>
  );
}

function SignalMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-l border-site-border pl-3 sm:pl-4">
      <p className="site-eyebrow text-[9px] text-site-muted">{label}</p>
      <p className="dashboard-signal-metric mt-1 font-mono text-2xl font-semibold text-site-action-hover">
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-site-muted">{detail}</p>
    </div>
  );
}

function EmptySignalDesk() {
  return (
    <section
      aria-labelledby="dashboard-empty-title"
      className="editor-signal-frame dashboard-signal-card relative overflow-hidden border border-site-action bg-[color-mix(in_srgb,var(--site-action)_7%,var(--site-surface))] px-5 py-7 sm:px-7 sm:py-9"
    >
      <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-nw" />
      <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-se" />
      <div className="relative max-w-2xl">
        <p className="site-eyebrow">First signal</p>
        <h2 id="dashboard-empty-title" className="site-section-title mt-2">
          No page is broadcasting yet.
        </h2>
        <p className="site-muted mt-3 max-w-xl text-sm leading-6">
          Bring your résumé. You will shape the story, choose the visual world, and review the finished page before anything goes public.
        </p>
        <Link href="/create" className="site-button site-button-primary mt-5">
          Create Your Page
        </Link>
      </div>
    </section>
  );
}

export default function DashboardSignalDesk({
  accountAccess,
  activePaidPlanPriceLabel,
  displayName,
  maxPagesPerAccount,
  offlineAttemptAt,
  pages,
  publicSlug,
}: DashboardSignalDeskProps) {
  return (
    <main
      className="site-container-wide max-w-[84rem] overflow-x-clip py-8 sm:py-12"
      id="main-content"
      data-dashboard-signal-desk
    >
      <header className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="site-eyebrow">Signal desk · Your public page</p>
          <h1 className="site-page-title mt-2">
            {displayName ? (
              <>
                Welcome back, <span className="text-site-action">{displayName}</span>
              </>
            ) : (
              "Your Living Page"
            )}
          </h1>
          <p className="site-muted mt-3 max-w-2xl text-sm leading-6 sm:text-base">
            See whether your page is live, choose the next move, and read the attention that follows.
          </p>
        </div>
        {pages.length ? (
          <div className="border-l border-site-border pl-4 sm:pl-5">
            <p className="site-eyebrow text-[9px] text-site-muted">Public address</p>
            <p className="mt-1 max-w-72 truncate font-mono text-sm text-site-action-hover">
              /{publicSlug ?? pages[0]?.page.slug}
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-2 inline-flex min-h-8 items-center border-b border-site-border text-xs font-semibold text-site-secondary transition-colors hover:border-site-action hover:text-site-text"
            >
              Manage public URL
            </Link>
          </div>
        ) : (
          <Link href="/create" className="site-button site-button-primary self-start lg:self-auto">
            Create Your Page
          </Link>
        )}
      </header>

      {!pages.length ? (
        <EmptySignalDesk />
      ) : (
        <div className="space-y-4">
          {offlineAttemptAt ? (
            <div className="site-callout site-callout-warning px-4 py-3 text-sm">
              <strong className="text-site-text">Someone tried to open your page while it was offline</strong>
              {formatRelativeTime(offlineAttemptAt)
                ? ` ${formatRelativeTime(offlineAttemptAt)}`
                : ""}. Publish the page below when you are ready to restore the link.
            </div>
          ) : null}

          {pages.length > maxPagesPerAccount ? (
            <div className="site-callout site-callout-warning px-4 py-3 text-sm">
              This account still has legacy extra pages. Your public URL resolves through one username, so remove extras before relying on the page publicly.
            </div>
          ) : null}

          {!accountAccess.isLegacyAccount ? (
            <div className="site-callout px-4 py-3 text-xs leading-5 sm:text-sm">
              {accountAccess.hasPaidSubscription ? (
                <>
                  Your living resume is free and remains available regardless of billing. An
                  existing {accountAccess.publicPlanLabel} subscription at {activePaidPlanPriceLabel} is still on file.{" "}
                  <Link href="/dashboard/settings" className="font-semibold text-site-action hover:text-site-action-hover">
                    Review the subscription
                  </Link>
                  .
                </>
              ) : (
                <>Your living resume, public link, ATS-ready PDF, share card, themes, and analytics are free. No card or subscription is required.</>
              )}
            </div>
          ) : null}

          <p className="border-l border-site-border px-4 py-1 text-xs leading-5 text-site-muted">
            V1 supports one public page per account. Edit your current page, or delete it before creating a replacement.
          </p>

          <section className="grid gap-5" aria-label="Your Living Pages">
            {pages.map(({ page, proof, publicViewAvailable }) => {
              const livePath = `/${publicSlug ?? page.slug}`;
              const analyticsHref = `/dashboard/analytics/${page.id}`;
              const proofCopy = buildProofPanelCopy(proof, accountAccess.analyticsTier);
              const primaryAction = getDashboardPrimaryAction(
                proof.status,
                publicViewAvailable,
              );
              const avgReading = formatDurationShort(proof.avgEngagedSecondsLast7d);
              const themeName = getTheme(page.theme_id)?.name ?? page.theme_id;

              return (
                <article
                  key={page.id}
                  className="editor-signal-frame dashboard-signal-card relative overflow-hidden border border-site-border-strong bg-site-surface"
                  data-dashboard-signal-card
                >
                  <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-nw" />
                  <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-se" />

                  <div className="dashboard-signal-content relative">
                    <header className="grid gap-4 border-b border-site-border bg-[color-mix(in_srgb,var(--site-canvas-alt)_88%,transparent)] px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-site-muted">
                            Page signal
                          </span>
                          <span
                            className={`inline-flex items-center gap-2 border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] ${
                              publicViewAvailable
                                ? "site-status-success"
                                : "site-status-warning text-site-warning"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`dashboard-signal-status h-1.5 w-1.5 ${
                                publicViewAvailable ? "bg-site-success" : "bg-site-warning"
                              }`}
                            />
                            {publicViewAvailable ? "Live" : "Offline"}
                          </span>
                        </div>
                        <h2 className="mt-2 truncate font-site text-xl font-semibold tracking-[-0.035em] text-site-text sm:text-2xl">
                          {page.resume_data?.name ?? "Untitled"}
                        </h2>
                        <p className="mt-1 truncate text-sm text-site-secondary">
                          {page.resume_data?.headline ?? "Add a headline in Signal Studio"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs lg:text-right">
                        <div>
                          <p className="site-eyebrow text-[9px] text-site-muted">Address</p>
                          <p className="mt-1 font-mono text-site-action-hover">{livePath}</p>
                        </div>
                        <div>
                          <p className="site-eyebrow text-[9px] text-site-muted">Visual world</p>
                          <p className="mt-1 text-site-secondary">{themeName}</p>
                        </div>
                      </div>
                    </header>

                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
                      <section
                        aria-labelledby={`dashboard-next-signal-${page.id}`}
                        className="px-4 py-6 sm:px-5 sm:py-7 lg:border-r lg:border-site-border"
                      >
                        <p className="site-eyebrow">{proofCopy.eyebrow}</p>
                        <h3
                          id={`dashboard-next-signal-${page.id}`}
                          className="mt-2 max-w-2xl font-site text-2xl font-semibold tracking-[-0.04em] text-site-text sm:text-3xl"
                        >
                          {proofCopy.title}
                        </h3>
                        <p className="site-muted mt-3 max-w-2xl text-sm leading-6">
                          {proofCopy.body}
                        </p>
                        <div className="mt-5" data-dashboard-primary-action>
                          <DashboardPrimaryAction
                            action={primaryAction}
                            analyticsHref={analyticsHref}
                            livePath={livePath}
                            pageId={page.id}
                          />
                        </div>
                      </section>

                      <aside
                        className="border-t border-site-border bg-[color-mix(in_srgb,var(--site-canvas-alt)_72%,transparent)] px-4 py-5 sm:px-5 lg:border-t-0"
                        data-dashboard-signal-readout
                      >
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="site-eyebrow text-[9px] text-site-muted">7-day readout</p>
                            <p className="mt-1 text-xs text-site-secondary">Real activity, no vanity pulse</p>
                          </div>
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-site-muted">
                            Last 7d
                          </span>
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-3">
                          <SignalMetric
                            label="Looks"
                            value={String(proof.viewsLast7d)}
                            detail={`${page.views ?? 0} all-time`}
                          />
                          <SignalMetric
                            label="Shares"
                            value={String(proof.shareIntentCountLast7d)}
                            detail="Link sends"
                          />
                          <SignalMetric
                            label="Reading"
                            value={avgReading ?? "—"}
                            detail={avgReading ? "Average" : "Fills in"}
                          />
                        </div>
                        <div className="mt-5 border-t border-site-border pt-4">
                          <p className="text-xs leading-5 text-site-muted">
                            {proof.mobileViewsLast7d > 0
                              ? `${proof.mobileViewsLast7d} mobile look${proof.mobileViewsLast7d === 1 ? "" : "s"} this week.`
                              : "No mobile looks recorded this week."}
                          </p>
                        </div>
                      </aside>
                    </div>

                    <footer
                      className="grid gap-4 border-t border-site-border bg-site-canvas-alt px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                      data-dashboard-action-rail
                    >
                      <nav aria-label={`Actions for ${page.resume_data?.name ?? "this page"}`} className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/edit/${page.id}/living-page`}
                          className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                        >
                          Open Signal Studio
                        </Link>
                        {publicViewAvailable ? (
                          <Link
                            href={livePath}
                            className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                          >
                            View live
                          </Link>
                        ) : null}
                        <Link
                          href={`/dashboard/edit/${page.id}/living-page#ats-readiness`}
                          className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                        >
                          ATS check
                        </Link>
                        {primaryAction.kind !== "analytics" ? (
                          <Link
                            href={analyticsHref}
                            className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                          >
                            Analytics
                          </Link>
                        ) : null}
                      </nav>
                      <div className="flex items-center gap-3 border-l border-site-border pl-3">
                        <span className="hidden text-[10px] text-site-muted sm:inline">Permanent action</span>
                        <DeletePageButton pageId={page.id} />
                      </div>
                    </footer>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      )}
    </main>
  );
}
