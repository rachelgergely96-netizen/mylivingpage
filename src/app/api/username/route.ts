import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { slugifyUsername } from "@/lib/usernames";

const RESERVED_SLUGS = new Set([
  "login", "signup", "dashboard", "create", "api", "callback",
  "admin", "settings", "profile", "help", "about", "pricing",
  "terms", "privacy", "cookies", "acceptable-use", "dmca", "disclaimer",
  "security", "delete-account", "legal", "blog", "docs", "support",
]);

/** GET /api/username?slug=desired-slug — check availability */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("slug") ?? "";
  const slug = slugifyUsername(raw);

  if (!slug || slug.length < 3) {
    return NextResponse.json({ available: false, slug, reason: "Must be at least 3 characters." });
  }
  if (slug.length > 40) {
    return NextResponse.json({ available: false, slug, reason: "Must be 40 characters or fewer." });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ available: false, slug, reason: "This name is reserved." });
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", slug)
    .maybeSingle<{ id: string }>();

  // If it's the current user's own username, it's "available" to keep
  const authSupabase = createServerSupabaseClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  const isSelf = user && existing?.id === user.id;

  return NextResponse.json({ available: !existing || isSelf, slug, reason: existing && !isSelf ? "Already taken." : null });
}

/** PATCH /api/username — update the user's username + page slugs */
export async function PATCH(request: Request) {
  const authSupabase = createServerSupabaseClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { slug?: string };
  const slug = slugifyUsername(body.slug ?? "");

  if (!slug || slug.length < 3) {
    return NextResponse.json({ error: "URL must be at least 3 characters." }, { status: 400 });
  }
  if (slug.length > 40) {
    return NextResponse.json({ error: "URL must be 40 characters or fewer." }, { status: 400 });
  }
  if (RESERVED_SLUGS.has(slug)) {
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

  // Get old username to update page slugs
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single<{ username: string }>();

  const oldUsername = profile?.username;

  // Update profile username
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ username: slug })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: "Failed to update username." }, { status: 500 });
  }

  // Update all page slugs that matched the old username
  if (oldUsername) {
    await supabase
      .from("pages")
      .update({ slug })
      .eq("user_id", user.id)
      .eq("slug", oldUsername);
  }

  return NextResponse.json({ success: true, slug });
}
