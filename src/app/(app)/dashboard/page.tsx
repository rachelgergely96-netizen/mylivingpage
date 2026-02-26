import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PageRecord } from "@/types/resume";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pages } = await supabase
    .from("pages")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const list = (pages ?? []) as PageRecord[];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4A654]">Dashboard</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-[#F5F0EB]">Your Living Pages</h1>
        </div>
        <Link
          href="/create"
          className="gold-pill px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(212,166,84,0.35)]"
        >
          Create New Page
        </Link>
      </div>

      {!list.length ? (
        <section className="glass-card rounded-2xl p-8 text-center">
          <p className="text-sm text-[rgba(245,240,235,0.6)]">No pages yet. Start by creating your first living page.</p>
        </section>
      ) : (
        <section className="grid gap-3">
          {list.map((page) => (
            <article
              key={page.id}
              className="glass-card grid gap-4 rounded-2xl p-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="font-heading text-2xl text-[#F5F0EB]">{page.resume_data?.name ?? "Untitled"}</p>
                <p className="text-sm text-[rgba(245,240,235,0.45)]">
                  /{page.slug} · {page.resume_data?.headline ?? "No headline"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(245,240,235,0.3)]">Theme</p>
                <p className="text-sm capitalize text-[rgba(245,240,235,0.75)]">{page.theme_id}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(245,240,235,0.3)]">Views</p>
                <p className="font-mono text-sm text-[#F0D48A]">{page.views ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(245,240,235,0.3)]">Status</p>
                <p className="text-sm capitalize text-[rgba(245,240,235,0.75)]">{page.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${page.slug}`}
                  className="rounded-full border border-[rgba(212,166,84,0.35)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#D4A654] hover:text-[#F0D48A]"
                >
                  View
                </Link>
                <button
                  type="button"
                  disabled
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[rgba(245,240,235,0.4)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[rgba(245,240,235,0.4)]"
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
