import { NextResponse } from "next/server";
import {
  deleteUserAccount,
  isAccountDeletionError,
} from "@/lib/account/deleteUserAccount";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireRecentReauthentication } from "@/lib/auth/reauthentication";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const routeTrustLevel = "authenticated_user";

/** POST /api/account/delete — permanently delete user account and all data */
export async function POST(request: Request) {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "account_delete",
      route: "/api/account/delete",
      userId: user.id,
    });
    if (rateLimit.limited) return rateLimit.response;
  } catch {
    return NextResponse.json({ error: "Account deletion is temporarily unavailable." }, { status: 503 });
  }

  let body: { currentPassword?: unknown };
  try {
    body = (await request.json()) as { currentPassword?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const reauthentication = await requireRecentReauthentication(
    authClient,
    user,
    body.currentPassword,
  );
  if (!reauthentication.ok) {
    return NextResponse.json(
      { error: reauthentication.error, code: reauthentication.code },
      { status: reauthentication.status },
    );
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
