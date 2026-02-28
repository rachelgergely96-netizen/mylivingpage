import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

/** POST /api/account/delete — permanently delete user account and all data */
export async function POST() {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleSupabaseClient();
  const userId = user.id;

  // 1. Delete all user's pages
  await supabase
    .from("pages")
    .delete()
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`);

  // 2. Delete avatar files from storage
  const { data: avatarFiles } = await supabase.storage.from("avatars").list(userId);
  if (avatarFiles?.length) {
    await supabase.storage.from("avatars").remove(avatarFiles.map((f) => `${userId}/${f.name}`));
  }

  // 3. Delete profile
  await supabase.from("profiles").delete().eq("id", userId);

  // 4. Delete auth user
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
