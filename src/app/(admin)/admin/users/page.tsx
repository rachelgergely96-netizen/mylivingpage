import { ADMIN_EMAIL } from "@/lib/admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import AdminUsersTable from "@/components/admin/AdminUsersTable";

export default async function AdminUsersPage() {
  const supabase = createServiceRoleSupabaseClient();

  const [{ data: profiles }, { data: allPages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, email, avatar_url, plan, created_at, auth_provider, last_sign_in_at, sign_in_count, signup_referrer")
      .order("created_at", { ascending: false }),
    supabase
      .from("pages")
      .select("owner_id, user_id, views"),
  ]);

  // Aggregate page count and views per user
  const userStats: Record<string, { pageCount: number; totalViews: number }> = {};
  for (const page of allPages ?? []) {
    const p = page as { owner_id: string | null; user_id: string | null; views: number };
    const uid = p.owner_id ?? p.user_id;
    if (!uid) continue;
    if (!userStats[uid]) userStats[uid] = { pageCount: 0, totalViews: 0 };
    userStats[uid].pageCount++;
    userStats[uid].totalViews += p.views ?? 0;
  }

  const users = (profiles ?? []).map((profile) => {
    const p = profile as {
      id: string;
      username: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
      plan: string;
      created_at: string;
      auth_provider: string | null;
      last_sign_in_at: string | null;
      sign_in_count: number | null;
      signup_referrer: string | null;
    };
    const stats = userStats[p.id] ?? { pageCount: 0, totalViews: 0 };
    return {
      id: p.id,
      username: p.username,
      full_name: p.full_name,
      email: p.email,
      avatar_url: p.avatar_url,
      plan: p.plan,
      created_at: p.created_at,
      auth_provider: p.auth_provider,
      last_sign_in_at: p.last_sign_in_at,
      sign_in_count: p.sign_in_count ?? 0,
      signup_referrer: p.signup_referrer,
      pageCount: stats.pageCount,
      totalViews: stats.totalViews,
      isAdmin: p.email === ADMIN_EMAIL,
    };
  });

  const signupSourceCounts = users.reduce<Record<string, number>>((acc, user) => {
    if (!user.signup_referrer) {
      return acc;
    }
    acc[user.signup_referrer] = (acc[user.signup_referrer] ?? 0) + 1;
    return acc;
  }, {});

  const topSignupSources = Object.entries(signupSourceCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 md:px-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Admin</p>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#F0F4FF]">
          All Users
          <span className="ml-3 text-lg font-normal text-[rgba(240,244,255,0.4)]">
            ({users.length})
          </span>
        </h1>
      </div>
      <section className="glass-card mb-6 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Signup Sources</p>
        <p className="mt-2 text-sm text-[rgba(240,244,255,0.55)]">
          CTA refs are captured at signup so you can see which landing-page entries are turning into accounts.
        </p>
        {topSignupSources.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {topSignupSources.map(([source, count]) => (
              <span
                key={source}
                className="rounded-full border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] px-3 py-1.5 text-[11px] text-[#BFDBFE]"
              >
                <span className="font-mono">{source}</span> ({count})
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[rgba(240,244,255,0.4)]">No signup source data yet.</p>
        )}
      </section>
      <AdminUsersTable users={users} />
    </main>
  );
}
