import PageEditorClient from "@/components/edit/PageEditorClient";

interface LivingPageEditorRouteProps {
  params: Promise<{ pageId: string }>;
}

export default async function LivingPageEditorRoute({ params }: LivingPageEditorRouteProps) {
  const { pageId } = await params;
  return <PageEditorClient pageId={pageId} mode="living-page" />;
}
