import { NextRequest, NextResponse } from "next/server";
import {
  getClientIp,
  recordLegalAcceptance,
} from "@/lib/legal/acceptance";
import type { LegalAcceptanceSource } from "@/lib/legal/legal-version";
import { trackEvent } from "@/lib/track-event";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface LegalAcceptBody {
  source?: LegalAcceptanceSource;
}

const ALLOWED_SOURCES: LegalAcceptanceSource[] = ["signup", "checkout"];
const routeTrustLevel = "authenticated_user";

export async function POST(request: NextRequest) {
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

  let body: LegalAcceptBody = {};
  try {
    body = (await request.json()) as LegalAcceptBody;
  } catch {
    body = {};
  }

  const source = body.source ?? "signup";
  if (!ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  try {
    await recordLegalAcceptance({
      userId: user.id,
      source,
      ipAddress: getClientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
    });
  } catch (error) {
    await trackEvent(user.id, "legal.acceptance.failed", {
      source,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json(
      { error: "Unable to record legal acceptance." },
      { status: 500 },
    );
  }

  if (source === "signup") {
    await trackEvent(user.id, "user.signup", {}).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
