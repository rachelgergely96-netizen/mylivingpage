import Link from "next/link";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { PageRecord } from "@/types/resume";
import DeletePageButton from "@/components/DeletePageButton";
import { MAX_PAGES_PER_ACCOUNT, isPremiumPlan } from "@/lib/plans";

export default async function DashboardPage() {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const supabase = createServiceRoleSupabaseClient();

  const [{ data: profile }, { data: pages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, username, plan")
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
  const premium = isPremiumPlan(profile?.plan);
  const publicSlug = profile?.username ?? list[0]?.slug ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 md:px-10">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Dashboard</p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl md:text-4xl">
            {displayName ? (
              <>
                Welcome back, <span className="text-[#3B82F6]">{displayName}</span>
              </>
            ) : (
              "Your Living Page"
            )}
          </h1>
        </div>
        {!list.length ? (
          <Link
            href="/create"
            className="gold-pill self-start px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] sm:self-auto sm:px-6 sm:py-3"
          >
            Create Your Page
          </Link>
        ) : (
          <Link
            href="/dashboard/settings"
            className="self-start rounded-full border border-[rgba(255,255,255,0.15)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.5)] sm:self-auto sm:px-6 sm:py-3"
          >
            Manage Public URL
          </Link>
        )}
      </div>

      {!list.length ? (
        <section className="glass-card rounded-2xl p-5 text-center sm:p-8">
          <p className="text-sm text-[rgba(240,244,255,0.6)]">No pages yet. Start by creating your first living page.</p>
        </section>
      ) : (
        <section className="grid gap-3">
          <div className="rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.68)]">
            V1 supports one public page per account. Edit your current page, or delete it before creating a replacement.
          </div>
          {list.length > MAX_PAGES_PER_ACCOUNT ? (
            <div className="rounded-2xl border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.72)]">
              This account still has legacy extra pages. Your public URL resolves through one username, so remove extras before relying on the page publicly.
            </div>
          ) : null}
          {list.map((page) => (
            <article
              key={page.id}
              className="glass-card grid gap-3 rounded-2xl p-4 sm:gap-4 sm:p-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="font-heading text-lg text-[#F0F4FF] sm:text-2xl">{page.resume_data?.name ?? "Untitled"}</p>
                <p className="text-sm text-[rgba(240,244,255,0.45)]">
                  /{publicSlug ?? page.slug} · {page.resume_data?.headline ?? "No headline"}
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
                <p className="text-sm capitalize text-[rgba(240,244,255,0.75)]">
                  {page.status ?? (page.visibility === "public" ? "live" : page.visibility) ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Link
                  href={`/${publicSlug ?? page.slug}`}
                  className="rounded-full border border-[rgba(59,130,246,0.35)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] sm:px-4 sm:py-2"
                >
                  View
                </Link>
                <Link
                  href={`/dashboard/edit/${page.id}/living-page`}
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-4 sm:py-2"
                >
                  Edit Living
                </Link>
                <Link
                  href={`/dashboard/edit/${page.id}/ats-resume`}
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-4 sm:py-2"
                >
                  Edit ATS
                </Link>
                {premium ? (
                  <Link
                    href={`/dashboard/analytics/${page.id}`}
                    className="rounded-full border border-[rgba(255,255,255,0.15)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] sm:px-4 sm:py-2"
                  >
                    Analytics
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.1)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.3)] sm:px-4 sm:py-2"
                  >
                    Analytics
                    <span className="rounded-full bg-[rgba(59,130,246,0.15)] px-1.5 py-0.5 text-[9px] font-semibold text-[#3B82F6]">PRO</span>
                  </Link>
                )}
                <DeletePageButton pageId={page.id} />
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
