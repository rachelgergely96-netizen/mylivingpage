import { NextResponse } from "next/server";
import {
  deleteUserAccount,
  isAccountDeletionError,
} from "@/lib/account/deleteUserAccount";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireRecentReauthentication } from "@/lib/auth/reauthentication";
import { isPlainJsonObject } from "@/lib/security/page-write";
import { readUtf8BodyWithLimit } from "@/lib/security/request-body";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const routeTrustLevel = "authenticated_user";
const MAX_ACCOUNT_DELETE_BODY_BYTES = 16 * 1024;

/** POST /api/account/delete — permanently delete user account and all data */
export async function POST(request: Request) {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401 },
    );
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

  const bodyResult = await readUtf8BodyWithLimit(
    request,
    MAX_ACCOUNT_DELETE_BODY_BYTES,
  );
  if (!bodyResult.ok && bodyResult.reason === "too_large") {
    return NextResponse.json(
      { error: "Request payload is too large." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyResult.ok ? bodyResult.text : "") as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!isPlainJsonObject(body)) {
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
