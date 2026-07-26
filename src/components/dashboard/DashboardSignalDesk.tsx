import React from "react";
import Link from "next/link";
import type { AccountAccessState, AnalyticsTier } from "@/lib/account-access";
import type {
  PageProofStatus,
  PageProofSummary,
} from "@/lib/analytics/proofSummary";
import { getTheme } from "@/themes/registry";
import type { PageRecord } from "@/types/resume";
import DeletePageButton from "@/components/DeletePageButton";
import PublishPageButton from "@/components/PublishPageButton";
import DashboardCopyLinkButton from "@/components/dashboard/DashboardCopyLinkButton";
import DashboardPagePreview from "@/components/dashboard/DashboardPagePreview";
import {
  DashboardWelcomeBack,
  type DashboardWelcomeBackSnapshot,
} from "@/components/dashboard/DashboardWelcomeBack";

export interface DashboardSignalPage {
  offlineAttemptAt: string | null;
  page: PageRecord;
  proof: PageProofSummary;
  publicViewAvailable: boolean;
}

interface DashboardSignalDeskProps {
  accountAccess: AccountAccessState;
  activePaidPlanPriceLabel: string;
  displayName: string | null;
  maxPagesPerAccount: number;
  pages: DashboardSignalPage[];
  publicSlug: string | null;
  welcomeBackRequested?: boolean;
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
  publicViewAvailable: boolean,
  wasOpenedWhileOffline: boolean,
): ProofPanelCopy {
  if (!publicViewAvailable) {
    return wasOpenedWhileOffline
      ? {
          eyebrow: "Offline",
          title: "Put your page back online.",
          body: "Publish it again so people can use the link you already shared.",
        }
      : {
          eyebrow: "Private draft",
          title: "Your page is ready when you are.",
          body: "Keep editing, or publish when you want other people to see it. Until then, only you can open it.",
        };
  }

  switch (proof.status) {
    case "awaiting_views":
      return {
        eyebrow: "Waiting for views",
        title: "Your link is out. Waiting for the first view.",
        body: "We’ll show activity when someone opens the page. You can copy the link again for a follow-up.",
      };
    case "proof_landed":
      return {
        eyebrow: "Recent activity",
        title: "Someone viewed your page after you shared it.",
        body:
          analyticsTier === "full"
            ? proof.firstViewAfterLatestShareAt
              ? `First view after your share: ${formatRelativeTime(proof.firstViewAfterLatestShareAt)}. Open activity for device, referrer, and reading time.`
              : "Your page got a view after a recent share. Open activity to see what happened next."
            : "Your page got a view after a recent share. Open activity for more detail.",
      };
    case "active":
      return {
        eyebrow: "Active this week",
        title: `${proof.viewsLast7d} view${proof.viewsLast7d === 1 ? "" : "s"} in the last 7 days.`,
        body:
          analyticsTier === "full"
            ? proof.latestViewAt
              ? `Latest view ${formatRelativeTime(proof.latestViewAt)}. Open activity for the full picture.`
              : "Your page is getting views. Open activity for the full picture."
            : proof.latestViewAt
              ? `Latest view ${formatRelativeTime(proof.latestViewAt)}. Open activity for more detail.`
              : "Your page is getting views. Open activity for the full picture.",
      };
    default:
      return {
        eyebrow: "Ready to share",
        title: "Share your page with someone who needs to see it.",
        body: "Copy your public link for an application, recruiter reply, or introduction. Activity shows up here after someone opens it.",
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

  return { kind: "analytics", label: "View activity" };
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
    <Link
      href={analyticsHref}
      className="site-button site-button-primary w-full sm:w-auto"
    >
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
    <div
      className="min-w-0 border border-site-border bg-site-canvas-alt p-3"
      style={{ borderLeftColor: "var(--site-action)", borderLeftWidth: 2 }}
    >
      <p className="site-eyebrow text-[9px] text-site-muted">{label}</p>
      <p className="dashboard-signal-metric mt-1.5 font-mono text-2xl font-semibold text-site-action-hover">
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
      <span
        aria-hidden="true"
        className="editor-signal-corner editor-signal-corner-nw"
      />
      <span
        aria-hidden="true"
        className="editor-signal-corner editor-signal-corner-se"
      />
      <div className="relative max-w-2xl">
        <p className="site-eyebrow">Get started</p>
        <h2 id="dashboard-empty-title" className="site-section-title mt-2">
          You don’t have a Living Page yet.
        </h2>
        <p className="site-muted mt-3 max-w-xl text-sm leading-6">
          Start from your résumé. Edit the page, choose a theme, and review
          everything before you publish. Drafts stay private.
        </p>
        <Link href="/create" className="site-button site-button-primary mt-5">
          Create your page
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
  pages,
  publicSlug,
  welcomeBackRequested = false,
}: DashboardSignalDeskProps) {
  const welcomePage = pages[0] ?? null;
  const welcomeTheme = welcomePage
    ? (getTheme(welcomePage.page.theme_id) ?? getTheme("cosmic"))
    : null;
  const welcomeSnapshot: DashboardWelcomeBackSnapshot | null =
    welcomePage && welcomeTheme
      ? {
          accent: welcomeTheme.presentation.accent,
          accentBright: welcomeTheme.presentation.accentBright,
          accentSoft: welcomeTheme.presentation.accentSoft,
          displayName,
          livePath: `/${publicSlug ?? welcomePage.page.slug}`,
          offlineAttemptAt: welcomePage.offlineAttemptAt,
          pageName: welcomePage.page.resume_data?.name ?? "Untitled",
          proofStatus: welcomePage.proof.status,
          publicViewAvailable: welcomePage.publicViewAvailable,
          resumeData: welcomePage.page.resume_data,
          themeId: welcomePage.page.theme_id,
          themeName: welcomeTheme.name,
          viewsLast7d: welcomePage.proof.viewsLast7d,
        }
      : null;

  return (
    <>
      {welcomeBackRequested ? (
        <DashboardWelcomeBack snapshot={welcomeSnapshot} />
      ) : null}
      <main
        className="site-container-wide max-w-[84rem] overflow-x-clip py-8 sm:py-12"
        id="main-content"
        data-dashboard-signal-desk
        tabIndex={-1}
      >
        <header className="mb-7">
          <div className="max-w-3xl">
            <p className="site-eyebrow">Your page</p>
            <h1 className="site-page-title mt-2">
              {displayName ? (
                <>
                  Welcome back,{" "}
                  <span className="text-site-action">{displayName}</span>
                </>
              ) : (
                "Your Living Page"
              )}
            </h1>
            <p className="site-muted mt-3 max-w-2xl text-sm leading-6 sm:text-base">
              Check if your page is live, then edit, share, or review recent
              views.
            </p>
          </div>
        </header>

        {!pages.length ? (
          <EmptySignalDesk />
        ) : (
          <div className="space-y-4">
            {pages.length > maxPagesPerAccount ? (
              <div className="site-callout site-callout-warning px-4 py-3 text-sm">
                This account has more than one page from an earlier plan. Your
                public link uses one username—delete extras before sharing.
              </div>
            ) : null}

            <section className="grid gap-5" aria-label="Your Living Pages">
              {pages.map(
                ({ offlineAttemptAt, page, proof, publicViewAvailable }) => {
                  const livePath = `/${publicSlug ?? page.slug}`;
                  const analyticsHref = `/dashboard/analytics/${page.id}`;
                  const proofCopy = buildProofPanelCopy(
                    proof,
                    accountAccess.analyticsTier,
                    publicViewAvailable,
                    Boolean(offlineAttemptAt),
                  );
                  const primaryAction = getDashboardPrimaryAction(
                    proof.status,
                    publicViewAvailable,
                  );
                  const avgReading = formatDurationShort(
                    proof.avgEngagedSecondsLast7d,
                  );
                  const themeName =
                    getTheme(page.theme_id)?.name ?? page.theme_id;
                  const availabilityLabel = publicViewAvailable
                    ? "Live"
                    : offlineAttemptAt
                      ? "Offline"
                      : "Draft";

                  return (
                    <React.Fragment key={page.id}>
                      {offlineAttemptAt ? (
                        <div className="site-callout site-callout-warning px-4 py-3 text-sm">
                          <strong className="text-site-text">
                            Someone opened this link while the page was offline
                          </strong>
                          {formatRelativeTime(offlineAttemptAt)
                            ? ` ${formatRelativeTime(offlineAttemptAt)}`
                            : ""}
                          . Publish below to put it back online.
                        </div>
                      ) : null}

                      <article
                        className="editor-signal-frame dashboard-signal-card relative overflow-hidden border border-site-border-strong bg-site-surface"
                        data-dashboard-signal-card
                      >
                        <span
                          aria-hidden="true"
                          className="editor-signal-corner editor-signal-corner-nw"
                        />
                        <span
                          aria-hidden="true"
                          className="editor-signal-corner editor-signal-corner-se"
                        />

                        <div className="dashboard-signal-content relative">
                          <header className="grid gap-4 border-b border-site-border bg-[color-mix(in_srgb,var(--site-canvas-alt)_88%,transparent)] px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-2 border px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${
                                    publicViewAvailable
                                      ? "site-status-success"
                                      : "site-status-warning text-site-warning"
                                  }`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`dashboard-signal-status h-1.5 w-1.5 ${
                                      publicViewAvailable
                                        ? "bg-site-success"
                                        : "bg-site-warning"
                                    }`}
                                  />
                                  {availabilityLabel}
                                </span>
                              </div>
                              <h2 className="mt-2 truncate font-site text-xl font-semibold tracking-[-0.035em] text-site-text sm:text-2xl">
                                {page.resume_data?.name ?? "Untitled"}
                              </h2>
                              <p className="mt-1 truncate text-sm text-site-secondary">
                                {page.resume_data?.headline ??
                                  "Add a headline in the editor"}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs lg:text-right">
                              <div>
                                <p className="site-eyebrow text-[9px] text-site-muted">
                                  Link
                                </p>
                                <p className="mt-1 font-mono text-site-action-hover">
                                  {livePath}
                                </p>
                                <Link
                                  href="/dashboard/settings"
                                  className="mt-2 inline-flex min-h-7 items-center border-b border-site-border text-[10px] font-semibold text-site-muted transition-colors hover:border-site-action hover:text-site-text"
                                >
                                  Manage public URL
                                </Link>
                              </div>
                              <div>
                                <p className="site-eyebrow text-[9px] text-site-muted">
                                  Theme
                                </p>
                                <p className="mt-1 text-site-secondary">
                                  {themeName}
                                </p>
                              </div>
                            </div>
                          </header>

                          <div className="grid gap-0 lg:grid-cols-[minmax(15rem,0.82fr)_minmax(0,1.18fr)_minmax(15rem,0.6fr)]">
                            <div
                              className="border-b border-site-border px-4 py-6 sm:px-5 sm:py-7 lg:border-b-0 lg:border-r"
                              data-dashboard-preview-column
                            >
                              <p className="site-eyebrow text-[9px] text-site-muted">
                                {publicViewAvailable
                                  ? "Your live page"
                                  : "Draft preview"}
                              </p>
                              <div className="mt-3">
                                <DashboardPagePreview
                                  resumeData={page.resume_data}
                                  themeId={page.theme_id}
                                />
                              </div>
                            </div>
                            <section
                              aria-labelledby={`dashboard-next-signal-${page.id}`}
                              className="px-4 py-6 sm:px-5 sm:py-7 lg:border-r lg:border-site-border"
                            >
                              <p className="site-eyebrow">
                                {proofCopy.eyebrow}
                              </p>
                              <h3
                                id={`dashboard-next-signal-${page.id}`}
                                className="mt-2 max-w-2xl font-site text-2xl font-semibold tracking-[-0.04em] text-site-text sm:text-3xl"
                              >
                                {proofCopy.title}
                              </h3>
                              <p className="site-muted mt-3 max-w-2xl text-sm leading-6">
                                {proofCopy.body}
                              </p>
                              <div
                                className="mt-5"
                                data-dashboard-primary-action
                              >
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
                                  <p className="site-eyebrow text-[9px] text-site-muted">
                                    Last 7 days
                                  </p>
                                  <p className="mt-1 text-xs text-site-secondary">
                                    Page activity
                                  </p>
                                </div>
                              </div>
                              <div className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1">
                                <SignalMetric
                                  label="Views"
                                  value={String(proof.viewsLast7d)}
                                  detail={`${page.views ?? 0} all-time`}
                                />
                                <SignalMetric
                                  label="Share actions"
                                  value={String(proof.shareIntentCountLast7d)}
                                  detail="Copies, cards, opens"
                                />
                                <SignalMetric
                                  label="Avg. time"
                                  value={avgReading ?? "—"}
                                  detail={
                                    avgReading ? "Per view" : "Not enough data"
                                  }
                                />
                              </div>
                              <div className="mt-5 border-t border-site-border pt-4">
                                <p className="text-xs leading-5 text-site-muted">
                                  {proof.mobileViewsLast7d > 0
                                    ? `${proof.mobileViewsLast7d} mobile view${proof.mobileViewsLast7d === 1 ? "" : "s"} this week.`
                                    : "No mobile views this week."}
                                </p>
                              </div>
                            </aside>
                          </div>

                          <footer
                            className="grid gap-4 border-t border-site-border bg-site-canvas-alt px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                            data-dashboard-action-rail
                          >
                            <nav
                              aria-label={`Actions for ${page.resume_data?.name ?? "this page"}`}
                              className="flex flex-wrap gap-2"
                            >
                              <Link
                                href={`/dashboard/edit/${page.id}/living-page`}
                                className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                              >
                                Edit page
                              </Link>
                              {publicViewAvailable ? (
                                <Link
                                  href={livePath}
                                  className="site-button site-button-secondary px-3 py-2 text-xs sm:px-4"
                                >
                                  View live
                                </Link>
                              ) : null}
                              {publicViewAvailable &&
                              primaryAction.kind === "analytics" ? (
                                <DashboardCopyLinkButton
                                  emphasis="secondary"
                                  label="Copy link"
                                  livePath={livePath}
                                  pageId={page.id}
                                />
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
                                  Activity
                                </Link>
                              ) : null}
                            </nav>
                            <div className="flex items-center border-t border-site-border pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                              <DeletePageButton pageId={page.id} />
                            </div>
                          </footer>
                        </div>
                      </article>
                    </React.Fragment>
                  );
                },
              )}
            </section>

            <div className="grid gap-2">
              {!accountAccess.isLegacyAccount ? (
                <div className="site-callout px-4 py-3 text-xs leading-5 sm:text-sm">
                  {accountAccess.hasPaidSubscription ? (
                    <>
                      Your Living Page stays free. A{" "}
                      {accountAccess.publicPlanLabel} subscription at{" "}
                      {activePaidPlanPriceLabel} is still on file.{" "}
                      <Link
                        href="/dashboard/settings"
                        className="font-semibold text-site-action hover:text-site-action-hover"
                      >
                        Review subscription
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      Your Living Page is free to edit, publish, share, and
                      track. No credit card or subscription is required.
                    </>
                  )}
                </div>
              ) : null}

              <p className="border-l border-site-border px-4 py-1 text-xs leading-5 text-site-muted">
                One public page per account. Edit this one, or delete it to
                start over.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
