import Link from "next/link";
import { redirect } from "next/navigation";
import FeedbackWidget from "@/components/FeedbackWidget";
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 md:px-10">
          <Link href="/dashboard" className="font-heading text-xl font-bold">
            my<span className="text-[#3B82F6]">living</span>page
          </Link>
          <nav className="hidden items-center gap-2 sm:flex lg:gap-3" aria-label="Account navigation">
            {user.email === ADMIN_EMAIL && (
              <Link
                href="/admin"
                className="rounded-full border border-[rgba(239,68,68,0.3)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[#ff8e8e] transition-colors hover:border-[rgba(239,68,68,0.5)] hover:text-[#fca5a5]"
              >
                Admin
              </Link>
            )}
            <Link
              href="/dashboard"
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] transition-colors hover:text-[#93C5FD]"
            >
              My Resume
            </Link>
            <Link
              href="/dashboard/settings"
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] transition-colors hover:text-[#93C5FD]"
            >
              Settings
            </Link>
            <SignOutButton />
          </nav>
          <details className="group relative sm:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[rgba(255,255,255,0.14)] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.74)] marker:content-none">
              Menu
              <span aria-hidden="true" className="text-[#93C5FD] transition-transform group-open:rotate-180">
                &#8964;
              </span>
            </summary>
            <nav
              aria-label="Mobile account navigation"
              className="absolute right-0 top-12 z-50 flex min-w-52 flex-col gap-1 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(7,17,32,0.97)] p-2 shadow-[0_20px_60px_rgba(2,6,23,0.5)] backdrop-blur-xl"
            >
              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-3 text-sm text-[rgba(240,244,255,0.78)] hover:bg-[rgba(59,130,246,0.1)] hover:text-[#BFDBFE]"
              >
                My Resume
              </Link>
              <Link
                href="/dashboard/settings"
                className="rounded-xl px-4 py-3 text-sm text-[rgba(240,244,255,0.78)] hover:bg-[rgba(59,130,246,0.1)] hover:text-[#BFDBFE]"
              >
                Settings
              </Link>
              {user.email === ADMIN_EMAIL ? (
                <Link
                  href="/admin"
                  className="rounded-xl px-4 py-3 text-sm text-[#ffb4b4] hover:bg-[rgba(239,68,68,0.08)]"
                >
                  Admin
                </Link>
              ) : null}
              <div className="mt-1 border-t border-[rgba(255,255,255,0.08)] pt-2">
                <SignOutButton />
              </div>
            </nav>
          </details>
        </div>
      </header>
      <div>{children}</div>
      <FeedbackWidget />
    </div>
  );
}
