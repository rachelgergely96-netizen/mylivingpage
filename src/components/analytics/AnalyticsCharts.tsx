"use client";

interface DailyView {
  date: string;
  count: number;
}

interface ReferrerEntry {
  domain: string;
  count: number;
}

interface DeviceEntry {
  type: string;
  count: number;
}

interface CountryEntry {
  country: string;
  count: number;
}

interface AnalyticsChartsProps {
  pageName: string;
  totalViews: number;
  uniqueVisitors: number;
  dailyViews: DailyView[];
  referrers: ReferrerEntry[];
  devices: DeviceEntry[];
  countries: CountryEntry[];
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <p className="font-mono text-2xl sm:text-3xl font-bold text-[#93C5FD]">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
        {label}
      </p>
    </div>
  );
}

function DailyChart({ dailyViews }: { dailyViews: DailyView[] }) {
  const maxCount = Math.max(...dailyViews.map((d) => d.count), 1);

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
        Views — Last 30 Days
      </p>
      <div className="flex items-end gap-[3px] sm:gap-1" style={{ height: 120 }}>
        {dailyViews.map((day) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          return (
            <div
              key={day.date}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t-sm bg-[#3B82F6] opacity-70 transition-opacity group-hover:opacity-100"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[rgba(10,22,40,0.95)] px-2 py-1 text-[10px] text-[rgba(240,244,255,0.8)] shadow group-hover:block">
                {day.count} view{day.count !== 1 ? "s" : ""}
                <br />
                {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[rgba(240,244,255,0.25)]">
        <span>
          {dailyViews.length > 0
            ? new Date(dailyViews[0].date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
        <span>
          {dailyViews.length > 0
            ? new Date(
                dailyViews[dailyViews.length - 1].date + "T00:00:00"
              ).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : ""}
        </span>
      </div>
    </div>
  );
}

function ReferrerList({ referrers }: { referrers: ReferrerEntry[] }) {
  const total = referrers.reduce((sum, r) => sum + r.count, 0) || 1;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
        Top Referrers
      </p>
      {referrers.length === 0 ? (
        <p className="text-sm text-[rgba(240,244,255,0.35)]">No referrer data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {referrers.slice(0, 8).map((ref) => {
            const pct = Math.round((ref.count / total) * 100);
            return (
              <div key={ref.domain}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-[rgba(240,244,255,0.75)]">
                    {ref.domain}
                  </span>
                  <span className="ml-3 shrink-0 font-mono text-xs text-[rgba(240,244,255,0.4)]">
                    {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div
                    className="h-full rounded-full bg-[#3B82F6] opacity-60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CountryList({ countries }: { countries: CountryEntry[] }) {
  const total = countries.reduce((sum, c) => sum + c.count, 0) || 1;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
        Top Countries
      </p>
      {countries.length === 0 ? (
        <p className="text-sm text-[rgba(240,244,255,0.35)]">No country data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {countries.slice(0, 8).map((entry) => {
            const pct = Math.round((entry.count / total) * 100);
            return (
              <div key={entry.country}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-[rgba(240,244,255,0.75)]">
                    {entry.country}
                  </span>
                  <span className="ml-3 shrink-0 font-mono text-xs text-[rgba(240,244,255,0.4)]">
                    {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div
                    className="h-full rounded-full bg-[#3B82F6] opacity-60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeviceBreakdown({ devices }: { devices: DeviceEntry[] }) {
  const total = devices.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
        Devices
      </p>
      {devices.every((d) => d.count === 0) ? (
        <p className="text-sm text-[rgba(240,244,255,0.35)]">No device data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {devices.map((device) => {
            const pct = Math.round((device.count / total) * 100);
            return (
              <div key={device.type}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[rgba(240,244,255,0.75)]">{device.type}</span>
                  <span className="font-mono text-xs text-[rgba(240,244,255,0.4)]">
                    {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div
                    className="h-full rounded-full bg-[#3B82F6] opacity-60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsCharts({
  totalViews,
  uniqueVisitors,
  dailyViews,
  referrers,
  devices,
  countries,
}: AnalyticsChartsProps) {
  const last30 = dailyViews.reduce((sum, d) => sum + d.count, 0);
  const last7 = dailyViews.slice(-7).reduce((sum, d) => sum + d.count, 0);

  if (totalViews === 0 && last30 === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
        <p className="font-heading text-xl text-[#F0F4FF]">No views yet</p>
        <p className="mt-2 text-sm text-[rgba(240,244,255,0.5)]">
          Share your page to start seeing analytics. Views will appear here once visitors arrive.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Total Views" value={totalViews} />
        <StatCard label="Unique Visitors" value={uniqueVisitors} />
        <StatCard label="Last 30 Days" value={last30} />
        <StatCard label="Last 7 Days" value={last7} />
      </div>

      {/* Daily chart */}
      <DailyChart dailyViews={dailyViews} />

      {/* Referrers + Devices + Countries */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <ReferrerList referrers={referrers} />
        <DeviceBreakdown devices={devices} />
      </div>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <CountryList countries={countries} />
      </div>
    </div>
  );
}
