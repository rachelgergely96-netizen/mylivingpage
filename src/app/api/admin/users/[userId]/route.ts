import { NextResponse } from "next/server";
import {
  deleteUserAccount,
  getDeletionTargetProfile,
  isAccountDeletionError,
} from "@/lib/account/deleteUserAccount";
import { requireAdminUser } from "@/lib/security/route-security";

export const routeTrustLevel = "admin_only";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const adminResult = await requireAdminUser();
  if ("response" in adminResult) {
    return adminResult.response;
  }
  const { user } = adminResult.value;

  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  try {
    const profile = await getDeletionTargetProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (profile.email === user.email) {
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
