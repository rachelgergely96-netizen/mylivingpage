import Link from "next/link";
import { redirect } from "next/navigation";
import FeedbackWidget from "@/components/FeedbackWidget";
import AppNavigation from "@/components/ui/AppNavigation";
import { isAdminEmail } from "@/lib/admin";
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
    <div className="site-shell" data-site-ui>
      <a href="#site-content" className="site-skip-link">Skip to main content</a>
      <header className="site-header">
        <div className="site-container-wide flex h-16 items-center justify-between gap-4">
          <Link href="/" className="site-wordmark shrink-0">
            my<span>living</span>page
          </Link>
          <AppNavigation variant="product" showAdmin={isAdminEmail(user.email)} />
        </div>
      </header>
      <div id="site-content" tabIndex={-1}>{children}</div>
      <FeedbackWidget />
    </div>
  );
}
