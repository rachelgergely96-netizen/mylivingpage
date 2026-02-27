import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DownloadResumeButton from "@/components/DownloadResumeButton";
import MadeWithBadge from "@/components/MadeWithBadge";
import PageOwnerBar from "@/components/PageOwnerBar";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import ViewTracker from "@/components/ViewTracker";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ThemeId } from "@/themes/types";
import type { PageRecord } from "@/types/resume";

const VALID_THEMES: Set<string> = new Set([
  "cosmic", "fluid", "ember", "monolith", "aurora",
  "terracotta", "prism", "biolume", "circuit", "sakura",
  "glacier", "verdant", "neon", "topo", "luxe",
]);

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

  const themeId = (VALID_THEMES.has(page.theme_id) ? page.theme_id : "cosmic") as ThemeId;

  return (
    <main className="min-h-screen">
      <ViewTracker pageId={page.id} />
      <PageOwnerBar pageId={page.id} pageUserId={page.user_id} />
      <ThemeCanvas themeId={themeId} height="100dvh" className="rounded-none min-h-screen">
        <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.58)_100%)]">
          <ResumeLayout data={page.resume_data} />
        </div>
      </ThemeCanvas>
      <DownloadResumeButton data={page.resume_data} />
      <MadeWithBadge pageUserId={page.user_id} />
    </main>
  );
}
