import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

/** Authenticate the caller and return their user id, or null */
async function getAuthUserId() {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user?.id ?? null;
}

/** Fetch a page by id using service-role (bypasses RLS), verifying ownership */
async function fetchOwnedPage(pageId: string, userId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    .maybeSingle();
  return page;
}

export async function GET(_request: Request, { params }: { params: { pageId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = await fetchOwnedPage(params.pageId, userId);
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  return NextResponse.json(page);
}

export async function PATCH(request: Request, { params }: { params: { pageId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = await fetchOwnedPage(params.pageId, userId);
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const allowed = ["resume_data", "theme_id", "slug", "updated_at", "page_config"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from("pages").update(updates).eq("id", params.pageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: { pageId: string } }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = await fetchOwnedPage(params.pageId, userId);
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const supabase = createServiceRoleSupabaseClient();
  const { error: deleteError } = await supabase.from("pages").delete().eq("id", params.pageId);
  if (deleteError) return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });

  return NextResponse.json({ success: true });
}
