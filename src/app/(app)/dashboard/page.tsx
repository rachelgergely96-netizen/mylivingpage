import Link from "next/link";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { PageRecord } from "@/types/resume";

export default async function DashboardPage() {
  const authClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  // Use service-role client to bypass RLS for data queries
  const supabase = createServiceRoleSupabaseClient();

  const [{ data: profile }, { data: pages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("pages")
      .select("*")
      .or(`user_id.eq.${user?.id ?? ""},owner_id.eq.${user?.id ?? ""}`)
      .order("created_at", { ascending: false }),
  ]);

  const displayName = profile?.full_name || profile?.username || null;
  const list = (pages ?? []) as PageRecord[];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10 md:px-10">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Dashboard</p>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[#F0F4FF]">
            {displayName ? (
              <>Welcome back, <span className="text-[#3B82F6]">{displayName}</span></>
            ) : (
              "Your Living Pages"
            )}
          </h1>
        </div>
        <Link
          href="/create"
          className="gold-pill self-start sm:self-auto px-5 py-2.5 sm:px-6 sm:py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)]"
        >
          Create New Page
        </Link>
      </div>

      {!list.length ? (
        <section className="glass-card rounded-2xl p-5 sm:p-8 text-center">
          <p className="text-sm text-[rgba(240,244,255,0.6)]">No pages yet. Start by creating your first living page.</p>
        </section>
      ) : (
        <section className="grid gap-3">
          {list.map((page) => (
            <article
              key={page.id}
              className="glass-card grid gap-3 sm:gap-4 rounded-2xl p-4 sm:p-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="font-heading text-lg sm:text-2xl text-[#F0F4FF]">{page.resume_data?.name ?? "Untitled"}</p>
                <p className="text-sm text-[rgba(240,244,255,0.45)]">
                  /{page.slug} · {page.resume_data?.headline ?? "No headline"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.3)]">Theme</p>
                <p className="text-sm capitalize text-[rgba(240,244,255,0.75)]">{page.theme_id}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.3)]">Views</p>
                <p className="font-mono text-sm text-[#93C5FD]">{page.views ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.3)]">Status</p>
                <p className="text-sm capitalize text-[rgba(240,244,255,0.75)]">{page.status ?? (page.visibility === "public" ? "live" : page.visibility) ?? "—"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Link
                  href={`/${page.slug}`}
                  className="rounded-full border border-[rgba(59,130,246,0.35)] px-3 py-1.5 sm:px-4 sm:py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD]"
                >
                  View
                </Link>
                <Link
                  href={`/dashboard/edit/${page.id}`}
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 sm:px-4 sm:py-2 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  Edit
                </Link>
                <Link
                  href={`/dashboard/analytics/${page.id}`}
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 sm:px-4 sm:py-2 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  Analytics
                </Link>
                <button
                  type="button"
                  disabled
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 sm:px-4 sm:py-2 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]"
                >
                  Archive
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
