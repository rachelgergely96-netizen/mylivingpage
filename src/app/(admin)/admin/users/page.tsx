import AdminUsersTable from "@/components/admin/AdminUsersTable";
import styles from "@/components/admin/AdminExperience.module.css";
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

  const [profilesResult, pagesResult, authUsers] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, email, avatar_url, plan, created_at, auth_provider, last_sign_in_at, sign_in_count, signup_referrer")
      .order("created_at", { ascending: false }),
    supabase
      .from("pages")
      .select("owner_id, user_id, views"),
    listAllAuthUsers(supabase),
  ]);

  if (profilesResult.error || pagesResult.error) {
    throw new Error("Unable to load user review data.");
  }

  const users = buildAdminUserRows({
    profiles: ((profilesResult.data ?? []) as AdminProfileRow[]),
    pages: ((pagesResult.data ?? []) as AdminPageStatsRow[]),
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
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <p className="site-eyebrow">Manage / People</p>
          <h1 className="site-page-title mt-2">Users and account signals</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-site-secondary sm:text-base">
            Find an account, review confirmation and risk signals, or carefully remove
            an account when necessary.
          </p>
        </div>
        <span className="site-badge">{users.length} total users</span>
      </header>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="site-panel p-5">
          <p className="text-2xl font-semibold tabular-nums text-site-danger">{riskSummary.suspiciousTotal}</p>
          <p className="mt-1 text-xs font-medium text-site-muted">
            Suspicious users
          </p>
        </div>
        <div className="site-panel p-5">
          <p className="text-2xl font-semibold tabular-nums text-site-warning">{riskSummary.watchTotal}</p>
          <p className="mt-1 text-xs font-medium text-site-muted">
            Watch list
          </p>
        </div>
        <div className="site-panel p-5">
          <p className="text-2xl font-semibold tabular-nums text-site-action">{riskSummary.unconfirmedTotal}</p>
          <p className="mt-1 text-xs font-medium text-site-muted">
            Unconfirmed
          </p>
        </div>
        <div className="site-panel p-5">
          <p className="text-2xl font-semibold tabular-nums text-site-warning">{riskSummary.unconfirmedPastGrace}</p>
          <p className="mt-1 text-xs font-medium text-site-muted">
            Unconfirmed &gt; 24h
          </p>
        </div>
      </section>
      <section className="site-panel mb-6 p-5">
        <h2 className="site-panel-title">Signup sources</h2>
        <p className="mt-2 text-sm text-site-secondary">
          CTA refs are captured at signup so you can see which landing-page entries are turning into accounts.
        </p>
        {topSignupSources.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {topSignupSources.map(([source, count]) => (
              <span
                key={source}
                className="site-badge border-site-action bg-site-selected text-site-action-hover"
              >
                <span className="font-mono">{source}</span> ({count})
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-site-muted">No signup source data yet.</p>
        )}
      </section>
      <AdminUsersTable users={users} />
    </main>
  );
}
