import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requireAuthenticatedUser } from "@/lib/security/route-security";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { isReservedUsernameSlug, validateUsernameSlug } from "@/lib/usernames";

const routeTrustLevel = {
  GET: "public_read",
  PATCH: "authenticated_user",
};

/** GET /api/username?slug=desired-slug — check availability */
export async function GET(request: Request) {
  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "username_check",
      route: "/api/username",
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }
  } catch {
    return NextResponse.json(
      { available: false, reason: "Username checks are temporarily unavailable." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("slug") ?? "";
  const { slug, error } = validateUsernameSlug(raw);

  if (error) {
    return NextResponse.json({ available: false, slug, reason: error });
  }
  if (isReservedUsernameSlug(slug)) {
    return NextResponse.json({ available: false, slug, reason: "This name is reserved." });
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", slug)
    .maybeSingle<{ id: string }>();

  // If it's the current user's own username, it's "available" to keep
  const authSupabase = await createServerSupabaseClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  const isSelf = user && existing?.id === user.id;

  return NextResponse.json({ available: !existing || isSelf, slug, reason: existing && !isSelf ? "Already taken." : null });
}

/** PATCH /api/username — update the user's username + page slugs */
export async function PATCH(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if ("response" in authResult) {
    return authResult.response;
  }
  const { user } = authResult.value;

  let body: { slug?: string };
  try {
    body = (await request.json()) as { slug?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { slug, error } = validateUsernameSlug(body.slug ?? "");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  if (isReservedUsernameSlug(slug)) {
    return NextResponse.json({ error: "This name is reserved." }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();

  // Check uniqueness
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", slug)
    .maybeSingle<{ id: string }>();

  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "This URL is already taken." }, { status: 409 });
  }

  // Update profile username
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ username: slug })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: "Failed to update username." }, { status: 500 });
  }

  // Mirror the account username into legacy page slug fields.
  await supabase
    .from("pages")
    .update({ slug })
    .eq("owner_id", user.id);

  return NextResponse.json({ success: true, slug });
}
