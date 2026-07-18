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
    <main className="site-container-wide py-8">
      <div className="mb-6">
        <p className="site-eyebrow">Admin</p>
        <h1 className="site-page-title mt-2">
          All Pages
          <span className="ml-3 text-lg font-normal tabular-nums text-site-muted">
            ({pages.length})
          </span>
        </h1>
      </div>
      <AdminPagesTable pages={pages} />
    </main>
  );
}
