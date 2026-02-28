import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import AdminPagesTable from "@/components/admin/AdminPagesTable";

export default async function AdminPagesPage() {
  const supabase = createServiceRoleSupabaseClient();

  const [{ data: allPages }, { data: profiles }] = await Promise.all([
    supabase
      .from("pages")
      .select("id, slug, status, visibility, title, theme_id, views, owner_id, user_id, resume_data, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, email"),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => {
      const profile = p as { id: string; username: string; email: string | null };
      return [profile.id, profile];
    })
  );

  const pages = (allPages ?? []).map((page) => {
    const pg = page as {
      id: string;
      slug: string;
      status: string | null;
      visibility: string | null;
      title: string | null;
      theme_id: string;
      views: number;
      owner_id: string | null;
      user_id: string | null;
      resume_data: { name?: string } | null;
      created_at: string;
    };
    const ownerId = pg.owner_id ?? pg.user_id;
    const owner = ownerId ? profileMap.get(ownerId) : null;
    return {
      id: pg.id,
      slug: pg.slug,
      status: pg.status,
      visibility: pg.visibility,
      title: pg.title,
      theme_id: pg.theme_id,
      views: pg.views,
      created_at: pg.created_at,
      pageName: pg.resume_data?.name || pg.title || pg.slug,
      ownerUsername: owner?.username ?? "unknown",
      ownerEmail: owner?.email ?? null,
    };
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 md:px-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Admin</p>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#F0F4FF]">
          All Pages
          <span className="ml-3 text-lg font-normal text-[rgba(240,244,255,0.4)]">
            ({pages.length})
          </span>
        </h1>
      </div>
      <AdminPagesTable pages={pages} />
    </main>
  );
}
