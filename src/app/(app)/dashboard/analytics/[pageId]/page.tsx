import Link from "next/link";
import { notFound } from "next/navigation";
import AnalyticsCharts from "@/components/analytics/AnalyticsCharts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PageRecord } from "@/types/resume";

export default async function AnalyticsPage({
  params,
}: {
  params: { pageId: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Fetch the page and verify ownership
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("id", params.pageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!page) notFound();

  const typedPage = page as PageRecord;

  // Fetch page_views for the last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: views } = await supabase
    .from("page_views")
    .select("viewed_at, referrer, user_agent")
    .eq("page_id", params.pageId)
    .gte("viewed_at", ninetyDaysAgo.toISOString())
    .order("viewed_at", { ascending: true });

  const rows = (views ?? []) as {
    viewed_at: string;
    referrer: string | null;
    user_agent: string | null;
  }[];

  // Build last 30 days array with zero-fill
  const dailyViews: { date: string; count: number }[] = [];
  const countByDay: Record<string, number> = {};
  for (const row of rows) {
    const day = row.viewed_at.slice(0, 10);
    countByDay[day] = (countByDay[day] ?? 0) + 1;
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyViews.push({ date: key, count: countByDay[key] ?? 0 });
  }

  // Aggregate referrers
  const refCounts: Record<string, number> = {};
  for (const row of rows) {
    let domain = "Direct";
    if (row.referrer) {
      try {
        domain = new URL(row.referrer).hostname.replace(/^www\./, "");
      } catch {
        domain = "Unknown";
      }
    }
    refCounts[domain] = (refCounts[domain] ?? 0) + 1;
  }
  const referrers = Object.entries(refCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  // Aggregate devices
  const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0 };
  for (const row of rows) {
    const ua = row.user_agent ?? "";
    if (/Tablet|iPad/i.test(ua)) deviceCounts.Tablet++;
    else if (/Mobile|Android|iPhone/i.test(ua)) deviceCounts.Mobile++;
    else deviceCounts.Desktop++;
  }
  const devices = Object.entries(deviceCounts).map(([type, count]) => ({
    type,
    count,
  }));

  const pageName = typedPage.resume_data?.name ?? "Untitled";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10 md:px-10">
      <div className="mb-6 sm:mb-8">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-[rgba(245,240,235,0.5)] transition-colors hover:text-[#F0D48A]"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Dashboard
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4A654]">
            Analytics
          </p>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5F0EB]">
            {pageName}
          </h1>
          <p className="mt-1 text-sm text-[rgba(245,240,235,0.45)]">
            /{typedPage.slug}
          </p>
        </div>
      </div>

      <AnalyticsCharts
        pageName={pageName}
        totalViews={typedPage.views ?? 0}
        dailyViews={dailyViews}
        referrers={referrers}
        devices={devices}
      />
    </main>
  );
}
