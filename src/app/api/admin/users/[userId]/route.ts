import { NextResponse } from "next/server";
import { ADMIN_EMAIL } from "@/lib/admin";
import {
  deleteUserAccount,
  getDeletionTargetProfile,
  isAccountDeletionError,
} from "@/lib/account/deleteUserAccount";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  try {
    const profile = await getDeletionTargetProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (profile.email === ADMIN_EMAIL) {
      return NextResponse.json({ error: "The admin account cannot be deleted from this flow." }, { status: 403 });
    }

    await deleteUserAccount({
      targetUserId: userId,
      actorUserId: user.id,
      auditEventName: "admin.user_deleted",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAccountDeletionError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
