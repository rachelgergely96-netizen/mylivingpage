import { NextResponse } from "next/server";
import { isPlainJsonObject } from "@/lib/security/page-write";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const routeTrustLevel = "public_write";

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "waitlist_submit",
      route: "/api/waitlist",
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }
  } catch {
    return NextResponse.json(
      { error: "Waitlist signup is temporarily unavailable." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  if (!isPlainJsonObject(body)) {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const rawEmail = body.email;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const rawReferralCode = body.referralCode;
  if (rawReferralCode !== undefined && typeof rawReferralCode !== "string") {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { error } = await supabase.from("waitlist").insert({
      email,
      referral_code: rawReferralCode?.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "You are already on the waitlist." });
      }
      console.error("waitlist.insert_failed", { error: error.message });
      return NextResponse.json(
        { error: "Unable to join the waitlist right now." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "You are in. We will email launch updates soon." });
  } catch (error) {
    console.error("waitlist.unhandled_error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json(
      { error: "Unable to join the waitlist right now." },
      { status: 500 },
    );
  }
}
