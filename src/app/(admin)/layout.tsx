import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/ui/SignOutButton";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-heading text-xl font-bold">
              my<span className="text-[#3B82F6]">living</span>page
            </Link>
            <span className="rounded-full border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#ff8e8e]">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] transition-colors hover:text-[#93C5FD]"
            >
              Overview
            </Link>
            <Link
              href="/admin/users"
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] transition-colors hover:text-[#93C5FD]"
            >
              Users
            </Link>
            <Link
              href="/admin/pages"
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] transition-colors hover:text-[#93C5FD]"
            >
              Pages
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] transition-colors hover:text-[#93C5FD]"
            >
              Back to App
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
