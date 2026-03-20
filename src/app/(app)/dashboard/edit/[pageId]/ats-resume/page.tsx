import { redirect } from "next/navigation";

interface AtsResumeEditorRouteProps {
  params: Promise<{ pageId: string }>;
}

export default async function AtsResumeEditorRoute({ params }: AtsResumeEditorRouteProps) {
  const { pageId } = await params;
  redirect(`/dashboard/edit/${pageId}/living-page`);
}
