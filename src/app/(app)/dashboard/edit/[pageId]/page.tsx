import { redirect } from "next/navigation";

interface LegacyEditRedirectPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function LegacyEditRedirectPage({
  params,
}: LegacyEditRedirectPageProps) {
  const { pageId } = await params;
  redirect(`/dashboard/edit/${pageId}/living-page`);
}
