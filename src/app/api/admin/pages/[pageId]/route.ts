import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/route-security";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

const routeTrustLevel = "admin_only";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const authResult = await requireAdminUser();
  if ("response" in authResult) return authResult.response;

  const { pageId } = await params;
  if (!/^[a-z0-9-]+$/i.test(pageId)) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("pages")
    .update({ status: "draft", visibility: "private" })
    .eq("id", pageId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to unpublish page." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Page not found." }, { status: 404 });

  await trackEvent(authResult.value.user.id, "admin.page.unpublished", { page_id: pageId });
  return NextResponse.json({ success: true });
}
