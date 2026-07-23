import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import AdminPagesTable from "@/components/admin/AdminPagesTable";
import styles from "@/components/admin/AdminExperience.module.css";

export default async function AdminPagesPage() {
  const supabase = createServiceRoleSupabaseClient();

  const [pagesResult, profilesResult] = await Promise.all([
    supabase
      .from("pages")
      .select("id, slug, status, visibility, title, theme_id, views, owner_id, user_id, resume_data, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, email"),
  ]);

  if (pagesResult.error || profilesResult.error) {
    throw new Error("Unable to load Living Page admin data.");
  }

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => {
      const profile = p as { id: string; username: string; email: string | null };
      return [profile.id, profile];
    })
  );

  const pages = (pagesResult.data ?? []).map((page) => {
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
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <p className="site-eyebrow">Manage / Product</p>
          <h1 className="site-page-title mt-2">Living Pages</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-site-secondary">
            Search published and draft pages, see who owns each one, and open live
            pages for review.
          </p>
        </div>
        <span className="site-badge">{pages.length} total pages</span>
      </header>
      <AdminPagesTable pages={pages} />
    </main>
  );
}
