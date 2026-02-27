import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: { pageId: string } }) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: page } = await supabase
    .from("pages")
    .select("id, user_id")
    .eq("id", params.pageId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  if (page.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteError } = await supabase.from("pages").delete().eq("id", params.pageId);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
