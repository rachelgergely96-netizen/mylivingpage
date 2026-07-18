"use client";

interface DailyDatum {
  date: string;
  count: number;
}

export function AdminDailyChart({ title, dailyData }: { title: string; dailyData: DailyDatum[] }) {
  const maxCount = Math.max(...dailyData.map((d) => d.count), 1);

  return (
    <section className="site-panel p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-site-text">
        {title}
      </h2>
      <div
        role="img"
        className="flex items-end gap-[3px] border-b border-site-border sm:gap-1"
        style={{ height: 120 }}
        aria-label={`${title} bar chart`}
      >
        {dailyData.map((day) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          return (
            <div
              key={day.date}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className="absolute bottom-0 w-full bg-site-action opacity-70 transition-opacity group-hover:opacity-100"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap border border-site-border bg-site-surface-raised px-2 py-1 text-[10px] tabular-nums text-site-text shadow-[var(--site-shadow-raised)] group-hover:block">
                {day.count}
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
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-site-muted">
        <span>
          {dailyData.length > 0
            ? new Date(dailyData[0].date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
        <span>
          {dailyData.length > 0
            ? new Date(
                dailyData[dailyData.length - 1].date + "T00:00:00"
              ).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : ""}
        </span>
      </div>
    </section>
  );
}
