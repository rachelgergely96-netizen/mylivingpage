import AdminUsersTable from "@/components/admin/AdminUsersTable";
import {
  buildAdminUserRows,
  listAllAuthUsers,
  summarizeAdminUserRisk,
  type AdminPageStatsRow,
  type AdminProfileRow,
} from "@/lib/admin-user-review";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = createServiceRoleSupabaseClient();

  const [{ data: profiles }, { data: allPages }, authUsers] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, email, avatar_url, plan, created_at, auth_provider, last_sign_in_at, sign_in_count, signup_referrer")
      .order("created_at", { ascending: false }),
    supabase
      .from("pages")
      .select("owner_id, user_id, views"),
    listAllAuthUsers(supabase),
  ]);

  const users = buildAdminUserRows({
    profiles: ((profiles ?? []) as AdminProfileRow[]),
    pages: ((allPages ?? []) as AdminPageStatsRow[]),
    authUsers,
  });
  const riskSummary = summarizeAdminUserRisk(users);

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
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-5">
          <p className="font-mono text-2xl text-[#ff8e8e]">{riskSummary.suspiciousTotal}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
            Suspicious Users
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="font-mono text-2xl text-[#fbbf24]">{riskSummary.watchTotal}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
            Watch List
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="font-mono text-2xl text-[#93C5FD]">{riskSummary.unconfirmedTotal}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
            Unconfirmed
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="font-mono text-2xl text-[#fbbf24]">{riskSummary.unconfirmedPastGrace}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">
            Unconfirmed &gt; 24h
          </p>
        </div>
      </section>
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
