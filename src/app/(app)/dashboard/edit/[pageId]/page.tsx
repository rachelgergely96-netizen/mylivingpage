import { redirect } from "next/navigation";

interface LegacyEditRedirectPageProps {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function LegacyEditRedirectPage({
  params,
  searchParams,
}: LegacyEditRedirectPageProps) {
  const { pageId } = await params;
  const { tab } = await searchParams;

  if (tab === "ats-resume") {
    redirect(`/dashboard/edit/${pageId}/ats-resume`);
  }

  redirect(`/dashboard/edit/${pageId}/living-page`);
}
