import Link from "next/link";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { AdminDailyChart } from "@/components/admin/AdminCharts";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="site-panel p-4 sm:p-5">
      <p className="text-2xl font-semibold tabular-nums text-site-action sm:text-3xl">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-xs font-medium text-site-muted">
        {label}
      </p>
    </div>
  );
}

function buildDailyBuckets(timestamps: string[], days: number): { date: string; count: number }[] {
  const byDay: Record<string, number> = {};
  for (const ts of timestamps) {
    const day = ts.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: byDay[key] ?? 0 });
  }
  return result;
}

export default async function AdminOverviewPage() {
  const supabase = createServiceRoleSupabaseClient();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDayCutoff = sevenDaysAgo.toISOString();

  // Parallel queries
  const [
    { count: totalUsers },
    { count: totalPages },
    { count: waitlistCount },
    { count: googleUserCount },
    { count: activeSevenDayCount },
    { data: allPages },
    { data: recentProfiles },
    { data: recentViews },
    { data: latestUsers },
    { data: latestPages },
    { data: recentEvents },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("pages").select("*", { count: "exact", head: true }),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("auth_provider", "google"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_sign_in_at", sevenDayCutoff),
    supabase.from("pages").select("views"),
    supabase.from("profiles").select("created_at").gte("created_at", cutoff).order("created_at", { ascending: true }),
    supabase.from("page_views").select("viewed_at").gte("viewed_at", cutoff).order("viewed_at", { ascending: true }),
    supabase.from("profiles").select("username, full_name, email, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("pages").select("slug, views, created_at, resume_data").order("created_at", { ascending: false }).limit(5),
    supabase.from("events").select("event_name, metadata, created_at, user_id").order("created_at", { ascending: false }).limit(15),
  ]);

  const totalViews = (allPages ?? []).reduce((sum, p) => sum + ((p as { views: number }).views ?? 0), 0);

  const dailySignups = buildDailyBuckets(
    (recentProfiles ?? []).map((p) => (p as { created_at: string }).created_at),
    30
  );
  const dailyViews = buildDailyBuckets(
    (recentViews ?? []).map((v) => (v as { viewed_at: string }).viewed_at),
    30
  );

  return (
    <main className="site-container-wide py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="site-eyebrow">Admin</p>
        <h1 className="site-page-title mt-2">Platform Overview</h1>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        <StatCard label="Total Users" value={totalUsers ?? 0} />
        <StatCard label="Total Pages" value={totalPages ?? 0} />
        <StatCard label="Total Views" value={totalViews} />
        <StatCard label="Google Users" value={googleUserCount ?? 0} />
        <StatCard label="Active (7d)" value={activeSevenDayCount ?? 0} />
        <StatCard label="Waitlist" value={waitlistCount ?? 0} />
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <AdminDailyChart title="Signups — Last 30 Days" dailyData={dailySignups} />
        <AdminDailyChart title="Views — Last 30 Days" dailyData={dailyViews} />
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent signups */}
        <section className="site-panel p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-site-text">
              Recent Signups
            </h2>
            <Link href="/admin/users" className="text-xs font-semibold text-site-action hover:text-site-action-hover">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {(latestUsers ?? []).map((u) => {
              const user = u as { username: string; full_name: string | null; email: string | null; created_at: string };
              return (
                <div key={user.username} className="flex items-center justify-between gap-4 border-t border-site-border pt-3 first:border-t-0 first:pt-0">
                  <div>
                    <p className="text-sm text-site-text">{user.full_name || user.username}</p>
                    <p className="text-xs text-site-muted">{user.email}</p>
                  </div>
                  <p className="shrink-0 font-mono text-[10px] text-site-muted">
                    {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              );
            })}
            {(latestUsers ?? []).length === 0 && (
              <p className="text-sm text-site-muted">No users yet.</p>
            )}
          </div>
        </section>

        {/* Recent pages */}
        <section className="site-panel p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-site-text">
              Recent Pages
            </h2>
            <Link href="/admin/pages" className="text-xs font-semibold text-site-action hover:text-site-action-hover">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {(latestPages ?? []).map((p) => {
              const page = p as { slug: string; views: number; created_at: string; resume_data: { name?: string } };
              return (
                <div key={page.slug} className="flex items-center justify-between gap-4 border-t border-site-border pt-3 first:border-t-0 first:pt-0">
                  <div>
                    <p className="text-sm text-site-text">{page.resume_data?.name || page.slug}</p>
                    <p className="font-mono text-[11px] text-site-muted">/{page.slug}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums text-site-action">{page.views}</p>
                    <p className="font-mono text-[10px] text-site-muted">
                      {new Date(page.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
            {(latestPages ?? []).length === 0 && (
              <p className="text-sm text-site-muted">No pages yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Activity feed */}
      <div className="mt-6">
        <section className="site-panel p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-site-text">
            Recent Activity
          </h2>
          <div className="space-y-2.5">
            {(recentEvents ?? []).length === 0 ? (
              <p className="text-sm text-site-muted">No activity yet.</p>
            ) : (
              (recentEvents ?? []).map((e, i) => {
                const ev = e as { event_name: string; metadata: Record<string, unknown>; created_at: string; user_id: string | null };
                return (
                  <div key={`${ev.created_at}-${i}`} className="flex items-center justify-between gap-4 border-t border-site-border px-1 py-3 first:border-t-0">
                    <div className="min-w-0">
                      <p className="text-sm text-site-text">{ev.event_name}</p>
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <p className="max-w-xs truncate font-mono text-[10px] text-site-muted">
                          {JSON.stringify(ev.metadata)}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-mono text-[10px] text-site-muted">
                      {new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                      {new Date(ev.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
