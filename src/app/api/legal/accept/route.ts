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

export async function POST(request: NextRequest) {
  const authClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (source === "signup") {
    await trackEvent(user.id, "user.signup", {}).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
