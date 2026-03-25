import React from "react";
import Link from "next/link";
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

function metricAccentClass(status: AnalyticsMetric["status"]) {
  switch (status) {
    case "up":
      return "text-[#5BD67C] border-[rgba(91,214,124,0.24)] bg-[rgba(91,214,124,0.08)]";
    case "down":
      return "text-[#F59E8B] border-[rgba(245,158,139,0.24)] bg-[rgba(245,158,139,0.08)]";
    case "new":
      return "text-[#93C5FD] border-[rgba(147,197,253,0.28)] bg-[rgba(147,197,253,0.08)]";
    default:
      return "text-[rgba(240,244,255,0.5)] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)]";
  }
}

function renderComparison(metric: AnalyticsMetric, formatter: (value: number) => string) {
  if (metric.lowData) {
    return "Not enough data yet";
  }

  if (metric.status === "new") {
    return `New vs ${formatter(metric.previousValue)}`;
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
  secondary,
  testId,
}: {
  label: string;
  value: number;
  formatter: (value: number) => string;
  metric: AnalyticsMetric;
  helpText: string;
  secondary?: string;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(240,244,255,0.4)]">
            {label}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
            {formatter(value)}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${metricAccentClass(metric.status)}`}
        >
          {metric.lowData ? "Low data" : metric.status}
        </span>
      </div>
      <p className="mt-3 text-sm text-[rgba(240,244,255,0.62)]">
        {renderComparison(metric, formatter)}
      </p>
      <p className="mt-2 text-xs text-[rgba(240,244,255,0.42)]">{helpText}</p>
      {secondary ? (
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[#93C5FD]">
          {secondary}
        </p>
      ) : null}
    </div>
  );
}

function TrendChart({ analytics }: { analytics: PageAnalyticsDashboardData }) {
  const maxCount = Math.max(...analytics.trend.dailyViews.map((day) => day.count), 1);

  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
            Recent activity
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
            When people looked over {analytics.rangeLabel.toLowerCase()}
          </h2>
          <p
            data-testid="analytics-trend-total"
            className="mt-2 text-sm text-[rgba(240,244,255,0.5)]"
          >
            {formatPeopleLooked(analytics.trend.totalViews)} in this range.
          </p>
        </div>
        <div
          className={`self-start rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${metricAccentClass(analytics.trend.comparison.status)}`}
        >
          {renderComparison(analytics.trend.comparison, formatInteger)}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-end gap-1" style={{ height: 180 }}>
          {analytics.trend.dailyViews.map((day) => {
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;

            return (
              <div key={day.date} className="group relative flex-1" style={{ height: "100%" }}>
                <div
                  className="absolute bottom-0 w-full rounded-t-lg bg-[linear-gradient(180deg,#60A5FA,#2563EB)] opacity-75 transition-opacity group-hover:opacity-100"
                  style={{ height: `${Math.max(height, 3)}%` }}
                />
                <div className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(6,12,24,0.95)] px-2 py-1 text-[10px] text-[rgba(240,244,255,0.82)] shadow-lg group-hover:block">
                  {formatPeopleLooked(day.count)}
                  <br />
                  {day.label}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.12em] text-[rgba(240,244,255,0.28)]">
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
      <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.36)]">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[rgba(240,244,255,0.38)]">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[rgba(240,244,255,0.76)]">{row.label}</span>
                <span className="shrink-0 font-mono text-xs text-[rgba(240,244,255,0.48)]">
                  {row.count.toLocaleString()} | {Math.round(row.sharePct)}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-[#3B82F6]"
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
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Page Analytics</p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl md:text-4xl">
            {pageName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgba(240,244,255,0.62)]">
            See when people opened your page, how long they stayed, and what they did next after you shared it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[rgba(240,244,255,0.5)]">
            <a
              href={publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[rgba(59,130,246,0.28)] px-3 py-1.5 text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
            >
              {publicPath}
            </a>
            <span className="text-[rgba(240,244,255,0.3)]">
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
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]"
                    : "border-[rgba(255,255,255,0.12)] text-[rgba(240,244,255,0.55)] hover:border-[rgba(59,130,246,0.28)] hover:text-[#93C5FD]"
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
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
          Proof summary
        </p>
        <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">
          What the click is telling you
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
      {insights.map((insight) => (
        <div key={insight} className="glass-card rounded-2xl p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
            Signal
          </p>
          <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.72)]">{insight}</p>
        </div>
      ))}
      </div>
    </section>
  );
}

function GuidanceCard({
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
      className="glass-card rounded-3xl p-6 text-center sm:p-8"
    >
      <p className="font-heading text-xl text-[#F0F4FF] sm:text-2xl">{title}</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[rgba(240,244,255,0.56)]">
        {description}
      </p>
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
      className="rounded-3xl border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] p-5 sm:p-6"
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#93C5FD]">
        Limited detail mode
      </p>
      <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF]">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgba(240,244,255,0.66)]">
        {description}
      </p>
    </section>
  );
}

function DetailedAnalyticsPendingCard({ description }: { description: string }) {
  return (
      <GuidanceCard
      title="Deeper detail will return automatically"
      description={description}
      testId="analytics-availability-notice"
    />
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
      <div className="space-y-6">
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
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      ) : (
        <InsightsStrip insights={analytics.insights} />
      )}

      <section
        className={`grid gap-4 ${
          isBasic ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        <StatCard
          label="People Who Looked"
          value={analytics.overview.views.value}
          formatter={formatInteger}
          metric={analytics.overview.views}
          helpText={`People who opened your page in the selected ${analytics.rangeLabel.toLowerCase()}.`}
          secondary={`All-time looked: ${analytics.allTimeViews.toLocaleString()}`}
          testId="analytics-stat-views"
        />
        <StatCard
          label="New People"
          value={analytics.overview.uniqueVisitors.value}
          formatter={formatInteger}
          metric={analytics.overview.uniqueVisitors}
          helpText="Distinct outside visitors we could separate in this range."
          testId="analytics-stat-unique-visitors"
        />
        {!isBasic ? (
          <StatCard
            label="Clicked Through"
            value={analytics.overview.outboundCtr.value}
            formatter={formatPercent}
            metric={analytics.overview.outboundCtr}
            helpText="The share of page reviews that turned into at least one next-step click."
            testId="analytics-stat-outbound-ctr"
          />
        ) : null}
        {!isBasic ? (
          <StatCard
            label="Average Reading Time"
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
        />
      )}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-3xl p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
            Follow-Up Signals
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF]">
            What to do after the click
          </h2>
          <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.66)]">
            {analytics.followUp.summary}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#93C5FD]">Repeat views</p>
              <p className="mt-2 font-mono text-2xl text-[#F0F4FF]">
                {analytics.followUp.repeatVisitors}
              </p>
              <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.52)]">
                {analytics.followUp.repeatViewAlert
                  ? "At least one viewer came back more than once."
                  : "No repeat viewers in this range yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#93C5FD]">Latest look</p>
              <p className="mt-2 font-mono text-2xl text-[#F0F4FF]">
                {formatRelativeTime(analytics.followUp.latestViewAt) ?? "None"}
              </p>
              <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.52)]">
                {analytics.followUp.latestReferrerLabel
                  ? `Most recent source: ${analytics.followUp.latestReferrerLabel}`
                  : "Most recent source was a direct share."}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#93C5FD]">Suggested timing</p>
              <p className="mt-2 text-lg font-semibold text-[#F0F4FF]">
                {analytics.followUp.suggestedTimingLabel}
              </p>
              <p className="mt-2 text-xs leading-5 text-[rgba(240,244,255,0.66)]">
                {analytics.followUp.suggestedTimingDetail}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
            Variants
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF]">
            Target the next send
          </h2>
          {variantLabels.length > 0 ? (
            <>
              <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.66)]">
                You already have targeted versions ready. Use the one that matches the audience or moment instead of sending the base page every time.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {variantLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs text-[rgba(240,244,255,0.74)]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.66)]">
              No targeted versions yet. Create one for recruiter follow-up, one for hiring-manager context, or one for referral intros so the next link matches the moment.
            </p>
          )}
          <Link
            href={`/dashboard/edit/${pageId}/living-page`}
            className="mt-5 inline-flex rounded-full border border-[rgba(59,130,246,0.3)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE]"
          >
            Edit living page
          </Link>
        </div>
      </section>

      {analytics.state.hasTraffic ? (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <div className="glass-card rounded-3xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
                    Acquisition
                  </p>
                  <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF]">
                    How people found the page
                  </h2>
                </div>
                <div className="rounded-full border border-[rgba(255,255,255,0.1)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.48)]">
                  Direct share {formatPercent(analytics.acquisition.directSharePct)}
                </div>
              </div>
              <ShareBars
                title="Top referrers"
                emptyText="No referrer sources yet."
                rows={analytics.acquisition.topReferrers}
              />
            </div>

            <div className="glass-card rounded-3xl p-5 sm:p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
                Audience
              </p>
              <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF]">
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

          {isBasic ? (
            <DetailedAnalyticsPendingCard
              description="We can still show people who looked, activity trends, referrers, devices, and countries right now. Click, reading, and content insights will reappear automatically once the deeper detail is available."
            />
          ) : (
            <section className="grid gap-4 xl:grid-cols-2">
              <div className="glass-card rounded-3xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
                      Conversion
                    </p>
                    <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF]">
                      What they did next
                    </h2>
                  </div>
                  <div className="rounded-full border border-[rgba(59,130,246,0.24)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#93C5FD]">
                    {analytics.conversion.totalClicks.toLocaleString()} total clicks
                  </div>
                </div>
                {analytics.conversion.topActions.length === 0 ? (
                  <div className="mt-5">
                    <GuidanceCard
                      title="Traffic is showing up. Engagement is next."
                      description="People are landing on the page, but richer detail needs clicks or scrolling to build next-step and content insights. As more people explore the page, this view will fill in automatically."
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.34)]">
                          People who clicked next
                        </p>
                        <p className="mt-2 font-mono text-xl text-[#F0F4FF]">
                          {analytics.conversion.clickedViews.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.34)]">
                          Took next step
                        </p>
                        <p className="mt-2 font-mono text-xl text-[#F0F4FF]">
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

              <div className="glass-card rounded-3xl p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#3B82F6]">
                  Content Performance
                </p>
                <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F4FF]">
                  What kept attention
                </h2>
                {analytics.state.hasEngagement ? (
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.36)]">
                        Top section
                      </p>
                      {analytics.contentPerformance.topSection ? (
                        <div className="mt-3 rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] p-4">
                          <p className="font-heading text-lg text-[#F0F4FF]">
                            {analytics.contentPerformance.topSection.label}
                          </p>
                          <p className="mt-2 text-sm text-[rgba(240,244,255,0.56)]">
                            {Math.round(analytics.contentPerformance.topSection.sharePct)}% of
                            engaged readers spent the most visible time here.
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-[rgba(240,244,255,0.38)]">
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
                      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.34)]">
                          Avg scroll depth
                        </p>
                        <p className="mt-2 font-mono text-xl text-[#F0F4FF]">
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
                      title="Traffic is showing up. Engagement is next."
                      description="People are landing on the page, but richer detail needs clicks or scrolling to build content insights. As more people explore the page, this view will fill in automatically."
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
