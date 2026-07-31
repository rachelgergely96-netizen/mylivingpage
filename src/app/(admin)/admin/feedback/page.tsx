import AdminFeedbackInbox from "@/components/admin/AdminFeedbackInbox";
import styles from "@/components/admin/AdminExperience.module.css";
import {
  buildAdminFeedbackItems,
  countFeedbackByType,
  type AdminFeedbackEventRow,
  type AdminFeedbackProfileRow,
} from "@/lib/admin-feedback";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const supabase = createServiceRoleSupabaseClient();
  const { data: events, error: feedbackError, count: feedbackCount } = await supabase
    .from("events")
    .select("id, user_id, metadata, created_at", { count: "exact" })
    .eq("event_name", "feedback.submitted")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AdminFeedbackEventRow[]>();

  if (feedbackError) {
    throw new Error("Unable to load user feedback.");
  }

  const rows = events ?? [];
  const userIds = [...new Set(rows.flatMap((row) => (row.user_id ? [row.user_id] : [])))];
  let profiles: AdminFeedbackProfileRow[] = [];

  if (userIds.length) {
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, full_name, email")
      .in("id", userIds)
      .returns<AdminFeedbackProfileRow[]>();

    if (profileError) {
      throw new Error("Unable to load feedback sender details.");
    }
    profiles = data ?? [];
  }

  const items = buildAdminFeedbackItems({ events: rows, profiles });
  const counts = countFeedbackByType(items);
  const totalFeedback = feedbackCount ?? items.length;
  const feedbackNoun = totalFeedback === 1 ? "message" : "messages";

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageIntro}>
          <p className="site-eyebrow">Work queue / Feedback</p>
          <h1 className="site-page-title mt-2">What users are telling you</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-site-secondary sm:text-base">
            {totalFeedback > items.length
              ? `Showing the newest ${items.length} of ${totalFeedback} messages.`
              : `All ${totalFeedback} ${feedbackNoun} sent from the signed-in app are here.`}{" "}
            Search by person, page, or message, then follow up directly by email.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Feedback summary">
          <span className="site-badge site-badge-danger">
            {counts.bug} {counts.bug === 1 ? "bug" : "bugs"}
          </span>
          <span className="site-badge border-site-action bg-site-selected text-site-action-hover">
            {counts.feature} {counts.feature === 1 ? "idea" : "ideas"}
          </span>
          <span className="site-badge">
            {counts.general} {counts.general === 1 ? "note" : "notes"}
          </span>
        </div>
      </header>

      {items.length ? (
        <AdminFeedbackInbox items={items} />
      ) : (
        <section className={styles.emptyState}>
          <p className="site-eyebrow">Inbox clear</p>
          <h2 className="site-section-title mt-2">No feedback has arrived yet.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6">
            Signed-in users can send a bug report, idea, or general note from the
            Feedback button inside the app. Their message will appear here.
          </p>
        </section>
      )}

      <p className="mt-4 text-xs leading-5 text-site-muted">
        Feedback is stored privately in Supabase as a <code>feedback.submitted</code>{" "}
        event. It is not emailed or sent to another service.
      </p>
    </main>
  );
}
