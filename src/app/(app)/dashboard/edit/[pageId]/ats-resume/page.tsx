import PageEditorClient from "@/components/edit/PageEditorClient";

interface AtsResumeEditorRouteProps {
  params: Promise<{ pageId: string }>;
}

export default async function AtsResumeEditorRoute({ params }: AtsResumeEditorRouteProps) {
  const { pageId } = await params;
  return <PageEditorClient pageId={pageId} mode="ats-resume" />;
}
