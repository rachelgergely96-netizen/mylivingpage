import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DownloadResumeButton from "@/components/DownloadResumeButton";
import MadeWithBadge from "@/components/MadeWithBadge";
import PageOwnerBar from "@/components/PageOwnerBar";
import ResumeLayout from "@/components/ResumeLayout";
import ShareCardDownload from "@/components/ShareCardDownload";
import ThemeCanvas from "@/components/ThemeCanvas";
import ViewTracker from "@/components/ViewTracker";
import { fetchPublicLivePage } from "@/lib/pages/fetchPublicLivePage";
import { isPremiumPlan } from "@/lib/plans";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { ThemeId } from "@/themes/types";

const VALID_THEMES: Set<string> = new Set([
  "cosmic", "fluid", "ember", "monolith", "aurora",
  "terracotta", "prism", "biolume", "circuit", "sakura",
  "glacier", "verdant", "neon", "topo", "luxe",
  "dusk", "matrix", "coral", "stardust", "ink",
]);

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const supabase = createServiceRoleSupabaseClient();
  const page = await fetchPublicLivePage(supabase, params.username);
  if (!page) {
    return {
      title: "MyLivingPage",
      description: "Living digital pages for professionals.",
    };
  }

  const resume = page.resume_data;
  const title = `${resume.name} - ${resume.headline} | MyLivingPage`;
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
  const supabase = createServiceRoleSupabaseClient();
  const page = await fetchPublicLivePage(supabase, params.username);
  if (!page || (page.status !== "live" && page.visibility !== "public")) {
    notFound();
  }

  const themeId = (VALID_THEMES.has(page.theme_id) ? page.theme_id : "cosmic") as ThemeId;
  const pageUserId = page.user_id ?? page.owner_id ?? "";

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", pageUserId)
    .maybeSingle();
  const premium = isPremiumPlan(ownerProfile?.plan);

  return (
    <main className="min-h-screen">
      <ViewTracker pageId={page.id} />
      <PageOwnerBar pageId={page.id} pageUserId={pageUserId} />
      <ThemeCanvas themeId={themeId} height="100dvh" className="rounded-none min-h-screen">
        <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.58)_100%)]">
          <ResumeLayout data={page.resume_data} />
        </div>
      </ThemeCanvas>
      <DownloadResumeButton data={page.resume_data} premium={premium} />
      <ShareCardDownload pageUserId={pageUserId} slug={page.slug} premium={premium} />
      <MadeWithBadge pageUserId={pageUserId} premium={premium} />
    </main>
  );
}
