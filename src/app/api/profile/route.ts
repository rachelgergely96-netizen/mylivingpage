import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

/** GET /api/profile — fetch the authenticated user's profile */
export async function GET() {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleSupabaseClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, email, avatar_url, plan, created_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Include auth provider info so the UI knows whether to show password change
  const providers = user.app_metadata?.providers as string[] | undefined;
  const hasPassword = providers?.includes("email") ?? !!user.email;

  return NextResponse.json({ ...profile, hasPassword });
}

/** PATCH /api/profile — update full_name */
export async function PATCH(request: Request) {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof body.full_name === "string") {
    const name = body.full_name.trim();
    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be 100 characters or fewer." }, { status: 400 });
    }
    updates.full_name = name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });

  return NextResponse.json({ success: true });
}
