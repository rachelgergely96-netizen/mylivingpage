import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/ui/SignOutButton";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(26,10,46,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="font-heading text-xl font-bold">
            my<span className="text-[#D4A654]">living</span>page
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(245,240,235,0.7)] transition-colors hover:text-[#F0D48A]"
            >
              Dashboard
            </Link>
            <Link
              href="/create"
              className="gold-pill px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_32px_rgba(212,166,84,0.3)]"
            >
              Create
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
