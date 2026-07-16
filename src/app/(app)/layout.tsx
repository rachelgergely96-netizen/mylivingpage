import Link from "next/link";
import { redirect } from "next/navigation";
import FeedbackWidget from "@/components/FeedbackWidget";
import { ProfilePanel, ProfileWindow } from "@/components/ui/ProfilePanel";
import SignOutButton from "@/components/ui/SignOutButton";
import { ADMIN_EMAIL } from "@/lib/admin";
import { ensureUserProfile } from "@/lib/auth/ensureUserProfile";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createServiceRoleSupabaseClient();
  await ensureUserProfile(admin, user);

  return (
    <div className="profile-shell min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[rgba(125,170,255,0.14)] bg-[rgba(4,13,27,0.86)] px-3 py-2 backdrop-blur-xl sm:px-5">
        <div className="mx-auto w-full max-w-7xl">
          <ProfileWindow
            as="div"
            title="Personal profile account"
            status={<span className="profile-status">Member online</span>}
            className="!overflow-visible shadow-[4px_4px_0_rgba(2,6,23,0.32)] [&>.profile-titlebar]:rounded-t-[0.8rem] md:!overflow-hidden"
            contentClassName="flex min-h-12 items-center justify-between gap-3 px-3 py-1.5 sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard" className="shrink-0 font-heading text-lg font-bold text-[#F0F4FF] sm:text-xl">
                my<span className="text-[#60A5FA]">living</span>page
              </Link>
              <span className="hidden truncate border-l border-[rgba(255,255,255,0.1)] pl-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(191,219,254,0.48)] xl:block">
                Your corner of the professional web
              </span>
            </div>

            <nav className="hidden items-center gap-2 md:flex" aria-label="Account navigation">
              {user.email === ADMIN_EMAIL && (
                <Link
                  href="/admin"
                  className="profile-action border-[rgba(239,68,68,0.32)] bg-[rgba(239,68,68,0.08)] text-[#fca5a5]"
                >
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="profile-action">
                My Resume
              </Link>
              <Link href="/dashboard/settings" className="profile-action">
                Settings
              </Link>
              <SignOutButton />
            </nav>

            <details className="group relative md:hidden">
              <summary className="profile-action cursor-pointer list-none gap-2 marker:content-none">
                Menu
                <span aria-hidden="true" className="text-[#93C5FD] transition-transform group-open:rotate-180">
                  &#8964;
                </span>
              </summary>
              <ProfilePanel
                as="div"
                title="Account menu"
                meta="Member"
                className="absolute right-0 top-12 z-50 min-w-56 shadow-[7px_7px_0_rgba(2,6,23,0.46)]"
                contentClassName="p-2"
              >
                <nav aria-label="Mobile account navigation" className="flex flex-col gap-1">
                  <Link href="/dashboard" className="profile-action justify-start">
                    My Resume
                  </Link>
                  <Link href="/dashboard/settings" className="profile-action justify-start">
                    Settings
                  </Link>
                  {user.email === ADMIN_EMAIL ? (
                    <Link
                      href="/admin"
                      className="profile-action justify-start border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.07)] text-[#fca5a5]"
                    >
                      Admin
                    </Link>
                  ) : null}
                  <div className="mt-1 border-t border-[rgba(255,255,255,0.08)] pt-2">
                    <SignOutButton />
                  </div>
                </nav>
              </ProfilePanel>
            </details>
          </ProfileWindow>
        </div>
      </header>
      <div className="relative z-10">{children}</div>
      <FeedbackWidget />
    </div>
  );
}
