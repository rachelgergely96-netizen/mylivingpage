import Link from "next/link";
import { redirect } from "next/navigation";
import AppNavigation from "@/components/ui/AppNavigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  return (
    <div className="site-shell" data-site-ui>
      <a href="#site-content" className="site-skip-link">Skip to main content</a>
      <header className="site-header">
        <div className="site-container-wide flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="site-wordmark shrink-0">
              my<span>living</span>page
            </Link>
            <span className="site-badge site-badge-danger">
              Admin
            </span>
          </div>
          <AppNavigation variant="admin" />
        </div>
      </header>
      <div id="site-content" tabIndex={-1}>{children}</div>
    </div>
  );
}
