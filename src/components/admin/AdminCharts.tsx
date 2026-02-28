"use client";

interface DailyDatum {
  date: string;
  count: number;
}

export function AdminDailyChart({ title, dailyData }: { title: string; dailyData: DailyDatum[] }) {
  const maxCount = Math.max(...dailyData.map((d) => d.count), 1);

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
        {title}
      </p>
      <div className="flex items-end gap-[3px] sm:gap-1" style={{ height: 120 }}>
        {dailyData.map((day) => {
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
      <div className="mt-2 flex justify-between text-[10px] text-[rgba(240,244,255,0.25)]">
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
    </div>
  );
}
