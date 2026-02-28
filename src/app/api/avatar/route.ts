import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** POST /api/avatar — upload a headshot */
export async function POST(request: Request) {
  const authSupabase = createServerSupabaseClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 2 MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/headshot.${ext}`;

  const supabase = createServiceRoleSupabaseClient();

  // Remove any existing headshot first
  const { data: existing } = await supabase.storage.from("avatars").list(user.id);
  if (existing?.length) {
    await supabase.storage.from("avatars").remove(existing.map((f) => `${user.id}/${f.name}`));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  // Bust cache by appending timestamp
  const url = `${urlData.publicUrl}?t=${Date.now()}`;

  // Persist avatar URL to profiles
  await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);

  trackEvent(user.id, "avatar.upload");

  return NextResponse.json({ url });
}

/** DELETE /api/avatar — remove headshot */
export async function DELETE() {
  const authSupabase = createServerSupabaseClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleSupabaseClient();

  const { data: existing } = await supabase.storage.from("avatars").list(user.id);
  if (existing?.length) {
    await supabase.storage.from("avatars").remove(existing.map((f) => `${user.id}/${f.name}`));
  }

  // Clear avatar URL from profiles
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);

  trackEvent(user.id, "avatar.remove");

  return NextResponse.json({ success: true });
}
