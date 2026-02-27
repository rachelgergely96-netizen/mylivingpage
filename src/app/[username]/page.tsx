import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageOwnerBar from "@/components/PageOwnerBar";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import ViewTracker from "@/components/ViewTracker";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { THEME_MAP } from "@/themes/registry";
import type { PageRecord } from "@/types/resume";

export const revalidate = 60;

async function fetchLivePage(username: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: profile } = await supabase.from("profiles").select("id, username").eq("username", username).maybeSingle();

  if (!profile) {
    return null;
  }

  const { data: exactPage } = await supabase
    .from("pages")
    .select("*")
    .eq("user_id", profile.id)
    .eq("slug", username)
    .eq("status", "live")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exactPage) {
    return exactPage as PageRecord;
  }

  const { data: fallbackPage } = await supabase
    .from("pages")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "live")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (fallbackPage as PageRecord | null) ?? null;
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const page = await fetchLivePage(params.username);
  if (!page) {
    return {
      title: "MyLivingPage",
      description: "Living digital pages for professionals.",
    };
  }

  const resume = page.resume_data;
  const title = `${resume.name} · ${resume.headline} | MyLivingPage`;
  const description = resume.summary;
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${params.username}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "MyLivingPage",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicLivingPage({ params }: { params: { username: string } }) {
  const page = await fetchLivePage(params.username);
  if (!page || page.status !== "live") {
    notFound();
  }

  const themeId = page.theme_id in THEME_MAP ? (page.theme_id as keyof typeof THEME_MAP) : "cosmic";

  return (
    <main className="min-h-screen">
      <ViewTracker pageId={page.id} />
      <PageOwnerBar pageId={page.id} pageUserId={page.user_id} />
      <section className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-10">
        <div className="overflow-hidden rounded-2xl border border-[rgba(212,166,84,0.2)] shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.35)] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <div className="ml-3 rounded-md bg-[rgba(255,255,255,0.06)] px-3 py-1 font-mono text-[11px] text-[rgba(245,240,235,0.55)]">
              mylivingpage.com/<span className="text-[#F0D48A]">{page.slug}</span>
            </div>
          </div>
          <ThemeCanvas themeId={themeId} height="calc(100vh - 170px)" className="rounded-none">
            <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.58)_100%)]">
              <ResumeLayout data={page.resume_data} />
            </div>
          </ThemeCanvas>
        </div>
      </section>
    </main>
  );
}
