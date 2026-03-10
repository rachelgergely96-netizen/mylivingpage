import { NextResponse } from "next/server";
import {
  deleteUserAccount,
  isAccountDeletionError,
} from "@/lib/account/deleteUserAccount";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** POST /api/account/delete — permanently delete user account and all data */
export async function POST() {
  const authClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteUserAccount({ targetUserId: user.id });
  } catch (error) {
    if (isAccountDeletionError(error)) {
      const message = error.status === 409
        ? "Unable to cancel active billing. Please retry from Settings or contact support."
        : error.message;
      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
