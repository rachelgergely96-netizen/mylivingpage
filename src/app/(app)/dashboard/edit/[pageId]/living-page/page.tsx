import type { Metadata } from "next";
import PageEditorClient from "@/components/edit/PageEditorClient";

export const metadata: Metadata = {
  title: "Edit your page",
};

interface LivingPageEditorRouteProps {
  params: Promise<{ pageId: string }>;
}

export default async function LivingPageEditorRoute({ params }: LivingPageEditorRouteProps) {
  const { pageId } = await params;
  return <PageEditorClient pageId={pageId} />;
}
