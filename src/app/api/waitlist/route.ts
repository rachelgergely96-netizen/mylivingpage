import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; referralCode?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { error } = await supabase.from("waitlist").insert({
      email,
      referral_code: body.referralCode?.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "You are already on the waitlist." });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "You are in. We will email launch updates soon." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload." },
      { status: 400 },
    );
  }
}
