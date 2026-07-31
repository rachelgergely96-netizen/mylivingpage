import React from "react";
import Link from "next/link";
import AnalyticsCopyLinkButton from "@/components/analytics/AnalyticsCopyLinkButton";
import AnalyticsRetryButton from "@/components/analytics/AnalyticsRetryButton";
import {
  ANALYTICS_RANGE_DAYS,
  type AnalyticsRangeKey,
} from "@/lib/analytics/constants";
import type {
  AnalyticsMetric,
  PageAnalyticsDashboardData,
} from "@/lib/analytics/pageAnalytics";

interface PageAnalyticsDashboardProps {
  analytics: PageAnalyticsDashboardData;
  pageId: string;
  pageName: string;
  publicPath: string;
  variantLabels?: string[];
}

function formatInteger(value: number) {
  return Math.round(value).toLocaleString();
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDuration(seconds: number) {
  const wholeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;

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

function formatPeopleLooked(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "person looked" : "people looked"}`;
}

const STATUS_LABELS: Record<AnalyticsMetric["status"], string> = {
  up: "Trending up",
  down: "Trending down",
  flat: "Steady",
  new: "New",
};

function metricAccentClass(status: AnalyticsMetric["status"]) {
  switch (status) {
    case "up":
      return "site-badge-success";
    case "down":
      return "site-badge-danger";
    case "new":
      return "border-site-action text-site-action";
    default:
      return "";
  }
}

function renderComparison(metric: AnalyticsMetric, formatter: (value: number) => string) {
  if (metric.lowData) {
    return "Not enough data yet";
  }

  if (metric.status === "new") {
    return "First data for this period";
  }

  if (metric.deltaPercent === null) {
    return `Previous: ${formatter(metric.previousValue)}`;
  }

  const prefix = metric.deltaPercent > 0 ? "+" : "";
  return `${prefix}${metric.deltaPercent}% vs previous period`;
}

function StatCard({
  label,
  value,
  formatter,
  metric,
  helpText,
  testId,
}: {
  label: string;
  value: number;
  formatter: (value: number) => string;
  metric: AnalyticsMetric;
  helpText: string;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="site-panel p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-site-muted">
            {label}
          </p>
          <p className="mt-2 tabular-nums text-2xl font-bold text-site-text sm:text-3xl">
            {formatter(value)}
          </p>
        </div>
        <span
          className={`site-badge px-3 py-1 ${metricAccentClass(metric.status)}`}
        >
          {metric.lowData ? "Low data" : STATUS_LABELS[metric.status]}
        </span>
      </div>
      <p className="mt-3 text-sm tabular-nums text-site-secondary">
        {renderComparison(metric, formatter)}
      </p>
      <p className="mt-2 text-xs text-site-muted">{helpText}</p>
    </div>
  );
}

function TrendChart({ analytics }: { analytics: PageAnalyticsDashboardData }) {
  const maxCount = Math.max(...analytics.trend.dailyViews.map((day) => day.count), 1);
  const peakDay = analytics.trend.dailyViews.reduce(
    (best, day) => (day.count > best.count ? day : best),
    { date: "", label: "", count: 0 },
  );

  return (
    <section className="site-panel p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="site-eyebrow">
            Recent activity
          </p>
          <h2 className="site-panel-title mt-2 sm:text-2xl">
            When people looked over {analytics.rangeLabel.toLowerCase()}
          </h2>
          <p
            data-testid="analytics-trend-total"
            className="mt-2 text-sm tabular-nums text-site-secondary"
          >
            {formatPeopleLooked(analytics.trend.totalViews)} in this range.
          </p>
          {peakDay.count > 0 ? (
            <p className="mt-1 text-sm tabular-nums text-site-secondary">
              Busiest day: {peakDay.label} ({formatPeopleLooked(peakDay.count)}).
            </p>
          ) : null}
        </div>
        <div
          className={`site-badge self-start px-3 py-1.5 tabular-nums ${metricAccentClass(analytics.trend.comparison.status)}`}
        >
          {renderComparison(analytics.trend.comparison, formatInteger)}
        </div>
      </div>

      <div className="mt-6">
        <div
          role="img"
          className="flex items-end gap-px border-b border-site-border sm:gap-1"
          style={{ height: 180 }}
          aria-label={`Daily page views over ${analytics.rangeLabel.toLowerCase()}: ${formatPeopleLooked(analytics.trend.totalViews)} in total${
            peakDay.count > 0
              ? `; busiest day ${peakDay.label} with ${formatPeopleLooked(peakDay.count)}`
              : ""
          }.`}
        >
          {analytics.trend.dailyViews.map((day) => {
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;

            return (
              <div
                key={day.date}
                className="group relative flex-1"
                style={{ height: "100%" }}
                title={`${day.label}: ${formatPeopleLooked(day.count)}`}
              >
                <div
                  className="absolute bottom-0 w-full bg-site-action opacity-75 transition-opacity group-hover:opacity-100"
                  style={{ height: day.count > 0 ? `${Math.max(height, 3)}%` : "0%" }}
                />
                <div className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap border border-site-border bg-site-surface-raised px-2 py-1 text-xs tabular-nums text-site-text shadow-[var(--site-shadow-raised)] group-hover:block">
                  {formatPeopleLooked(day.count)}
                  <br />
                  {day.label}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between text-xs tabular-nums text-site-muted">
          <span>{analytics.trend.dailyViews[0]?.label ?? ""}</span>
          <span>
            {analytics.trend.dailyViews[analytics.trend.dailyViews.length - 1]?.label ?? ""}
          </span>
        </div>
      </div>
    </section>
  );
}

function ShareBars({
  title,
  emptyText,
  rows,
}: {
  title: string;
  emptyText: string;
  rows: Array<{ label: string; count: number; sharePct: number }>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-site-muted">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-site-muted">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-site-secondary">{row.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-site-muted">
                  {row.count.toLocaleString()} | {Math.round(row.sharePct)}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 bg-site-canvas-alt">
                <div
                  className="h-full bg-site-action"
                  style={{ width: `${Math.max(row.sharePct, row.count > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar({
  analytics,
  pageId,
  pageName,
  publicPath,
}: PageAnalyticsDashboardProps) {
  return (
    <section className="site-panel-raised p-4 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="site-eyebrow">Page activity</p>
          <h1 className="site-page-title mt-2 break-words">
            {pageName}
          </h1>
          <p className="site-muted mt-3 max-w-2xl text-sm leading-6">
            See when people opened your page, how long they stayed, and what they did next after you shared it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-site-secondary">
            <a
              href={publicPath}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open your public page ${publicPath} in a new tab`}
              className="site-button site-button-secondary px-3 py-1.5"
            >
              {publicPath}
              <svg
                aria-hidden="true"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 19.5L19.5 4.5M19.5 4.5H8.25M19.5 4.5v11.25"
                />
              </svg>
            </a>
            <span className="tabular-nums text-site-muted">
              All-time looks: {analytics.allTimeViews.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(ANALYTICS_RANGE_DAYS) as AnalyticsRangeKey[]).map((rangeKey) => {
            const active = analytics.rangeKey === rangeKey;

            return (
              <Link
                key={rangeKey}
                href={`/dashboard/analytics/${pageId}?range=${rangeKey}`}
                aria-current={active ? "page" : undefined}
                className={`site-button px-4 py-2 text-xs ${
                  active
                    ? "border-site-action bg-site-selected text-site-action"
                    : "site-button-secondary"
                }`}
              >
                {rangeKey.replace("d", " days")}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function InsightsStrip({ insights }: { insights: string[] }) {
  if (!insights.length) {
    return null;
  }

  return (
    <section className="site-panel p-4 sm:p-6">
      <div className="mb-4">
        <p className="site-eyebrow">
          Proof summary
        </p>
        <h2 className="site-panel-title mt-2 sm:text-2xl">
          What the click is telling you
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {insights.map((insight) => (
          <div key={insight} className="border border-site-border bg-site-canvas-alt p-4 sm:p-5">
            <p className="site-eyebrow">Signal</p>
            <p className="mt-3 text-sm leading-6 text-site-secondary">{insight}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GuidanceCard({
  title,
  description,
  action,
  variant = "panel",
  testId,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: "panel" | "plain";
  testId?: string;
}) {
  if (variant === "plain") {
    return (
      <div data-testid={testId} className="p-4 text-center sm:p-6">
        <p className="font-semibold text-site-text">{title}</p>
        <p className="site-muted mx-auto mt-3 max-w-2xl text-sm leading-6">
          {description}
        </p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    );
  }

  return (
    <section
      data-testid={testId}
      className="site-panel p-6 text-center sm:p-8"
    >
      <h2 className="site-panel-title text-xl sm:text-2xl">{title}</h2>
      <p className="site-muted mx-auto mt-3 max-w-2xl text-sm leading-6">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

function NoticeBanner({
  title,
  description,
  testId,
}: {
  title: string;
  description: string;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className="site-callout p-4 sm:p-6"
    >
      <p className="site-eyebrow">
        Limited detail mode
      </p>
      <h2 className="site-panel-title mt-2 text-xl">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-site-secondary">
        {description}
      </p>
    </section>
  );
}

export default function PageAnalyticsDashboard({
  analytics,
  pageId,
  pageName,
  publicPath,
  variantLabels = [],
}: PageAnalyticsDashboardProps) {
  const isBasic = analytics.state.availability === "basic";
  const isUnavailable = analytics.state.availability === "unavailable";

  if (isUnavailable) {
    return (
      <div className="space-y-6 font-site">
        <TopBar
          analytics={analytics}
          pageId={pageId}
          pageName={pageName}
          publicPath={publicPath}
        />
        <GuidanceCard
          testId="analytics-unavailable"
          title="Details are temporarily unavailable"
          description={
            analytics.state.notice ??
            "Traffic data could not be loaded right now. Please try again soon."
          }
          action={<AnalyticsRetryButton />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-site">
      <TopBar
        analytics={analytics}
        pageId={pageId}
        pageName={pageName}
        publicPath={publicPath}
      />

      {isBasic ? (
        <NoticeBanner
          testId="analytics-availability-notice"
          title="Deeper detail is temporarily unavailable"
          description={
            analytics.state.notice ??
            "Basic activity detail is still showing below. Richer reading and click insights will return automatically once the detailed data is available."
          }
        />
      ) : analytics.state.hasTraffic ? (
        <InsightsStrip insights={analytics.insights} />
      ) : null}

      <section
        className={`grid gap-4 ${
          isBasic ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        <StatCard
          label="People who looked"
          value={analytics.overview.views.value}
          formatter={formatInteger}
          metric={analytics.overview.views}
          helpText={`People who opened your page in the selected ${analytics.rangeLabel.toLowerCase()}.`}
          testId="analytics-stat-views"
        />
        <StatCard
          label="New people"
          value={analytics.overview.uniqueVisitors.value}
          formatter={formatInteger}
          metric={analytics.overview.uniqueVisitors}
          helpText="Distinct outside visitors we could separate in this range."
          testId="analytics-stat-unique-visitors"
        />
        {!isBasic ? (
          <StatCard
            label="Clicked through"
            value={analytics.overview.outboundCtr.value}
            formatter={formatPercent}
            metric={analytics.overview.outboundCtr}
            helpText="The share of page reviews that turned into at least one next-step click."
            testId="analytics-stat-outbound-ctr"
          />
        ) : null}
        {!isBasic ? (
          <StatCard
            label="Average reading time"
            value={analytics.overview.avgEngagedTime.value}
            formatter={formatDuration}
            metric={analytics.overview.avgEngagedTime}
            helpText="Average time people spent reading once they scrolled or interacted enough to measure."
            testId="analytics-stat-avg-engaged-time"
          />
        ) : null}
      </section>

      {analytics.state.hasTraffic ? (
        <TrendChart analytics={analytics} />
      ) : (
        <GuidanceCard
          title="No one has looked yet"
          description="Share your tracked page URL in follow-up emails, LinkedIn messages, or your email signature. Once people start opening it, this page will show that they looked, where they came from, and what they did next."
          action={<AnalyticsCopyLinkButton publicPath={publicPath} pageId={pageId} />}
        />
      )}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="site-panel p-4 sm:p-6">
          <p className="site-eyebrow">
            Follow-up signals
          </p>
          <h2 className="site-panel-title mt-2 text-xl">
            What to do after the click
          </h2>
          <p className="mt-3 text-sm leading-6 text-site-secondary">
            {analytics.followUp.summary}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="border border-site-border bg-site-canvas-alt p-4">
              <p className="text-xs font-semibold text-site-secondary">Repeat views</p>
              <p className="mt-2 tabular-nums text-2xl text-site-text">
                {analytics.followUp.repeatVisitors}
              </p>
              <p className="mt-2 text-xs leading-5 text-site-secondary">
                {analytics.followUp.repeatViewAlert
                  ? "At least one viewer came back more than once."
                  : "No repeat viewers in this range yet."}
              </p>
            </div>
            <div className="border border-site-border bg-site-canvas-alt p-4">
              <p className="text-xs font-semibold text-site-secondary">Latest look</p>
              <p className="mt-2 tabular-nums text-2xl text-site-text">
                {formatRelativeTime(analytics.followUp.latestViewAt) ?? "None"}
              </p>
              <p className="mt-2 text-xs leading-5 text-site-secondary">
                {analytics.followUp.latestReferrerLabel
                  ? `Most recent source: ${analytics.followUp.latestReferrerLabel}`
                  : "Most recent source was a direct share."}
              </p>
            </div>
            <div className="site-callout p-4">
              <p className="text-xs font-semibold text-site-secondary">Suggested timing</p>
              <p className="mt-2 text-lg font-semibold text-site-text">
                {analytics.followUp.suggestedTimingLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-site-secondary">
                {analytics.followUp.suggestedTimingDetail}
              </p>
            </div>
          </div>
        </div>

        <div className="site-panel p-4 sm:p-6">
          <p className="site-eyebrow">
            Variants
          </p>
          <h2 className="site-panel-title mt-2 text-xl">
            Target the next send
          </h2>
          {variantLabels.length > 0 ? (
            <>
              <p className="mt-3 text-sm leading-6 text-site-secondary">
                You already have targeted versions ready. Use the one that matches the audience or moment instead of sending the base page every time.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {variantLabels.map((label) => (
                  <span
                    key={label}
                    className="site-badge px-3 py-1 text-xs"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-site-secondary">
              No targeted versions yet. Create one for recruiter follow-up, one for hiring-manager context, or one for referral intros so the next link matches the moment.
            </p>
          )}
          <Link
            href={`/dashboard/edit/${pageId}/living-page`}
            className="site-button site-button-secondary mt-5 px-4 py-2 text-xs"
          >
            Edit living page
          </Link>
        </div>
      </section>

      {analytics.state.hasTraffic ? (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <div className="site-panel p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="site-eyebrow">
                    Acquisition
                  </p>
                  <h2 className="site-panel-title mt-2 text-xl">
                    How people found the page
                  </h2>
                </div>
                <div className="site-badge px-3 py-1 tabular-nums">
                  Direct share {formatPercent(analytics.acquisition.directSharePct)}
                </div>
              </div>
              <div className="mt-5">
                <ShareBars
                  title="Top referrers"
                  emptyText="No referrer sources yet."
                  rows={analytics.acquisition.topReferrers}
                />
              </div>
            </div>

            <div className="site-panel p-4 sm:p-6">
              <p className="site-eyebrow">
                Audience
              </p>
              <h2 className="site-panel-title mt-2 text-xl">
                Device and country mix
              </h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <ShareBars
                  title="Devices"
                  emptyText="No device mix yet."
                  rows={analytics.audience.devices}
                />
                <ShareBars
                  title="Countries"
                  emptyText="No country breakdown yet."
                  rows={analytics.audience.countries}
                />
              </div>
            </div>
          </section>

          {isBasic ? null : (
            <section className="grid gap-4 xl:grid-cols-2">
              <div className="site-panel p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="site-eyebrow">
                      Conversion
                    </p>
                    <h2 className="site-panel-title mt-2 text-xl">
                      What they did next
                    </h2>
                  </div>
                  <div className="site-badge px-3 py-1 tabular-nums">
                    {analytics.conversion.totalClicks.toLocaleString()} total clicks
                  </div>
                </div>
                {analytics.conversion.topActions.length === 0 ? (
                  <div className="mt-5">
                    <GuidanceCard
                      variant="plain"
                      title="Traffic is showing up. Engagement is next."
                      description="People are landing on the page, but next-step insights need clicks to build. As more people explore the page, this view will fill in automatically."
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="border border-site-border bg-site-canvas-alt p-4">
                        <p className="text-xs font-semibold text-site-secondary">
                          People who clicked next
                        </p>
                        <p className="mt-2 tabular-nums text-xl text-site-text">
                          {analytics.conversion.clickedViews.toLocaleString()}
                        </p>
                      </div>
                      <div className="border border-site-border bg-site-canvas-alt p-4">
                        <p className="text-xs font-semibold text-site-secondary">
                          Took next step
                        </p>
                        <p className="mt-2 tabular-nums text-xl text-site-text">
                          {formatPercent(analytics.overview.outboundCtr.value)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <ShareBars
                        title="Top clicked actions"
                        emptyText="No outbound clicks recorded yet."
                        rows={analytics.conversion.topActions.map((row) => ({
                          label: row.label,
                          count: row.count,
                          sharePct:
                            analytics.conversion.totalClicks > 0
                              ? (row.count / analytics.conversion.totalClicks) * 100
                              : 0,
                        }))}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="site-panel p-4 sm:p-6">
                <p className="site-eyebrow">
                  Content performance
                </p>
                <h2 className="site-panel-title mt-2 text-xl">
                  What kept attention
                </h2>
                {analytics.state.hasEngagement ? (
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-site-muted">
                        Top section
                      </p>
                      {analytics.contentPerformance.topSection ? (
                        <div className="site-callout mt-3 p-4">
                          <p className="text-lg font-semibold text-site-text">
                            {analytics.contentPerformance.topSection.label}
                          </p>
                          <p className="mt-2 text-sm tabular-nums text-site-secondary">
                            {analytics.state.lowData
                              ? `${analytics.contentPerformance.topSection.count.toLocaleString()} engaged ${
                                  analytics.contentPerformance.topSection.count === 1
                                    ? "reader"
                                    : "readers"
                                } spent the most visible time here.`
                              : `${Math.round(analytics.contentPerformance.topSection.sharePct)}% of engaged readers spent the most visible time here.`}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-site-muted">
                          No top section yet.
                        </p>
                      )}
                      <div className="mt-5">
                        <ShareBars
                          title="Section mix"
                          emptyText="No section engagement yet."
                          rows={analytics.contentPerformance.sections.map((row) => ({
                            label: row.label,
                            count: row.count,
                            sharePct: row.sharePct,
                          }))}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="border border-site-border bg-site-canvas-alt p-4">
                        <p className="text-xs font-semibold text-site-secondary">
                          Avg scroll depth
                        </p>
                        <p className="mt-2 tabular-nums text-xl text-site-text">
                          {analytics.contentPerformance.avgScrollDepthPct === null
                            ? "--"
                            : formatPercent(analytics.contentPerformance.avgScrollDepthPct)}
                        </p>
                      </div>
                      <div className="mt-5">
                        <ShareBars
                          title="Scroll depth distribution"
                          emptyText="No scroll depth recorded yet."
                          rows={analytics.contentPerformance.scrollDepth}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <GuidanceCard
                      variant="plain"
                      title="Reading insights need a bit more scrolling data"
                      description="People are landing on the page, but reading insights need scrolling activity to measure. As more people explore the page, this view will fill in automatically."
                    />
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
