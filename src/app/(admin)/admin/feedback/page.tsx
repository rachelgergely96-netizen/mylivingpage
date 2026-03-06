import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

interface EventRow {
  id: string;
  user_id: string | null;
  metadata: { message?: string } | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
}

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
      .select("id, username, full_name")
      .in("id", userIds)
      .returns<ProfileRow[]>();

    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = p;
      }
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Admin</p>
        <h1 className="mt-1 font-heading text-3xl font-bold text-[#F0F4FF]">User Feedback</h1>
        <p className="mt-1 text-sm text-[rgba(240,244,255,0.45)]">
          {rows.length} submission{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[rgba(240,244,255,0.4)]">
          No feedback submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const message = row.metadata?.message ?? "(no message)";
            const profile = row.user_id ? profileMap[row.user_id] : null;
            const username = profile?.username ?? null;
            const fullName = profile?.full_name ?? null;
            const displayName = fullName ?? username ?? "Unknown user";
            const date = new Date(row.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={row.id} className="glass-card rounded-2xl p-5">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm font-semibold text-[#F0F4FF]">{displayName}</span>
                    {username && (
                      <span className="ml-2 text-xs text-[rgba(240,244,255,0.4)]">@{username}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-[rgba(240,244,255,0.35)]">{date}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[rgba(240,244,255,0.75)]">
                  {message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
