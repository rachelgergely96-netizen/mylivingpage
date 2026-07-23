import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminFeedbackInbox from "@/components/admin/AdminFeedbackInbox";
import styles from "@/components/admin/AdminExperience.module.css";
import AdminShell from "@/components/admin/AdminShell";
import AdminSignalDesk from "@/components/admin/AdminSignalDesk";
import type { AdminFeedbackItem } from "@/lib/admin-feedback";
import { isEditorPreviewEnabled } from "@/lib/editor-preview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Layout Preview | MyLivingPage",
  robots: {
    index: false,
    follow: false,
  },
};

const feedbackItems: AdminFeedbackItem[] = [
  {
    id: "feedback-preview-1",
    userId: "user-avery",
    message:
      "The ATS comparison helped, but I almost missed the matched words section on mobile.",
    type: "bug",
    page: "/dashboard/edit/page-1/ats-resume",
    createdAt: "2026-07-23T14:40:00.000Z",
    sender: {
      displayName: "Avery Sample",
      username: "avery",
      email: "avery@example.com",
    },
  },
  {
    id: "feedback-preview-2",
    userId: "user-morgan",
    message:
      "I would love a simple way to duplicate my page before changing it for another role.",
    type: "feature",
    page: "/dashboard",
    createdAt: "2026-07-23T12:10:00.000Z",
    sender: {
      displayName: "Morgan Sample",
      username: "morgan",
      email: "morgan@example.com",
    },
  },
  {
    id: "feedback-preview-3",
    userId: "user-jordan",
    message: "The new examples made it much easier to understand when I should send the link.",
    type: "general",
    page: "/examples",
    createdAt: "2026-07-22T19:20:00.000Z",
    sender: {
      displayName: "Jordan Sample",
      username: "jordan",
      email: "jordan@example.com",
    },
  },
];

const dailySignups = Array.from({ length: 30 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 6, index + 1)).toISOString().slice(0, 10),
  count: index % 5 === 0 ? 3 : index % 3 === 0 ? 2 : 1,
}));

const dailyViews = Array.from({ length: 30 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 6, index + 1)).toISOString().slice(0, 10),
  count: 4 + ((index * 3) % 11),
}));

export default async function AdminLayoutPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (!isEditorPreviewEnabled()) {
    notFound();
  }

  const { view } = await searchParams;
  const showFeedback = view === "feedback";

  return (
    <AdminShell
      currentPath={showFeedback ? "/admin/feedback" : "/admin"}
      previewLabel="Local preview"
      showSignOut={false}
    >
      {showFeedback ? (
        <main className={styles.page}>
          <header className={styles.pageHeader}>
            <div className={styles.pageIntro}>
              <p className="site-eyebrow">Work queue / Feedback</p>
              <h1 className="site-page-title mt-2">What users are telling you</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-site-secondary">
                Search by person, page, or message, then follow up directly by email.
              </p>
            </div>
            <span className="site-badge">{feedbackItems.length} messages</span>
          </header>
          <AdminFeedbackInbox items={feedbackItems} />
        </main>
      ) : (
        <AdminSignalDesk
          attention={[
            {
              detail: "Messages received in the last 7 days",
              href: "/dev/admin-preview?view=feedback",
              label: "Feedback",
              value: 3,
            },
            {
              detail: "Sign-in, publishing, or billing failures",
              href: "/admin/ops",
              label: "Failed actions",
              value: 1,
            },
            {
              detail: "Suspicious or unconfirmed for more than 24 hours",
              href: "/admin/users",
              label: "Accounts to review",
              value: 2,
            },
          ]}
          metrics={[
            { label: "Total users", value: 128 },
            { label: "Total Living Pages", value: 86 },
            { label: "Total page views", value: 4210 },
            { label: "Active in 7 days", value: 41 },
            { label: "Google sign-ins", value: 72 },
            { label: "Waitlist names", value: 9 },
          ]}
          dailySignups={dailySignups}
          dailyViews={dailyViews}
          latestFeedback={feedbackItems}
          recentActivity={[
            {
              createdAt: "2026-07-23T14:40:00.000Z",
              eventName: "feedback.submitted",
            },
            {
              createdAt: "2026-07-23T13:30:00.000Z",
              eventName: "page.publish.succeeded",
            },
            {
              createdAt: "2026-07-23T12:05:00.000Z",
              eventName: "auth.callback.succeeded",
            },
          ]}
          recentUsers={[
            {
              createdAt: "2026-07-23T13:00:00.000Z",
              displayName: "Avery Sample",
              email: "avery@example.com",
              username: "avery",
            },
            {
              createdAt: "2026-07-22T18:00:00.000Z",
              displayName: "Morgan Sample",
              email: "morgan@example.com",
              username: "morgan",
            },
          ]}
          recentPages={[
            {
              createdAt: "2026-07-23T13:00:00.000Z",
              name: "Avery Sample",
              slug: "avery",
              views: 42,
            },
            {
              createdAt: "2026-07-22T18:00:00.000Z",
              name: "Morgan Sample",
              slug: "morgan",
              views: 31,
            },
          ]}
        />
      )}
    </AdminShell>
  );
}
