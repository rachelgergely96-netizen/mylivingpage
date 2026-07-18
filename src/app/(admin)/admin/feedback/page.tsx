import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

interface EventRow {
  id: string;
  user_id: string | null;
  metadata: { message?: string; type?: string; page?: string } | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
}

const TYPE_STYLES: Record<string, string> = {
  bug: "site-badge-danger",
  feature: "border-site-action bg-site-selected text-site-action-hover",
  general: "",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  general: "General",
};

export default async function AdminFeedbackPage() {
  const supabase = createServiceRoleSupabaseClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, user_id, metadata, created_at")
    .eq("event_name", "feedback.submitted")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<EventRow[]>();

  const rows = events ?? [];

  // Fetch profiles for all user_ids in one query
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const profileMap: Record<string, ProfileRow> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, email")
      .in("id", userIds)
      .returns<ProfileRow[]>();

    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = p;
      }
    }
  }

  return (
    <main className="site-container py-10">
      <div className="mb-8">
        <p className="site-eyebrow">Admin</p>
        <h1 className="site-page-title mt-2">User Feedback</h1>
        <p className="mt-2 text-sm tabular-nums text-site-muted">
          {rows.length} submission{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="site-panel p-8 text-center text-sm text-site-muted">
          No feedback submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const message = row.metadata?.message ?? "(no message)";
            const feedbackType = row.metadata?.type ?? "general";
            const feedbackPage = row.metadata?.page ?? null;
            const profile = row.user_id ? profileMap[row.user_id] : null;
            const username = profile?.username ?? null;
            const fullName = profile?.full_name ?? null;
            const email = profile?.email ?? null;
            const displayName = fullName ?? username ?? "Unknown user";
            const typeBadgeClass = TYPE_STYLES[feedbackType] ?? TYPE_STYLES.general;
            const typeLabel = TYPE_LABELS[feedbackType] ?? feedbackType;
            const date = new Date(row.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <article key={row.id} className="site-panel p-5">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-site-text">{displayName}</h2>
                      {username && (
                        <span className="font-mono text-xs text-site-muted">@{username}</span>
                      )}
                      <span className={`site-badge text-[10px] ${typeBadgeClass}`}>
                        {typeLabel}
                      </span>
                    </div>
                    {email && (
                      <span className="text-xs text-site-muted">{email}</span>
                    )}
                  </div>
                  <time dateTime={row.created_at} className="shrink-0 font-mono text-xs text-site-muted">{date}</time>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-site-secondary">
                  {message}
                </p>
                {feedbackPage && (
                  <p className="mt-2 font-mono text-[11px] text-site-muted">
                    Page: {feedbackPage}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
