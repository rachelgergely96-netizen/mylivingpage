import { NextResponse } from "next/server";
import { FREE_THEMES, isPremiumPlan, isPremiumTheme } from "@/lib/plans";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { usernameFromEmail } from "@/lib/usernames";

interface PublishBody {
  title: string;
  theme_id: string;
  resume_data: unknown;
  raw_resume: string;
  page_config?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<PublishBody>;
    if (!body.theme_id || !body.resume_data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, username")
      .eq("id", user.id)
      .maybeSingle();

    const userPlan = profile?.plan ?? "spark";
    const premium = isPremiumPlan(userPlan);
    const username = profile?.username ?? usernameFromEmail(user.email);

    if (!premium && isPremiumTheme(body.theme_id)) {
      return NextResponse.json(
        { error: `The "${body.theme_id}" theme requires a premium plan. Free themes: ${FREE_THEMES.join(", ")}.` },
        { status: 403 },
      );
    }

    if (!profile?.username) {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          username,
          email: user.email,
          plan: userPlan,
        },
        { onConflict: "id" },
      );
    }

    const { data: existing } = await supabase
      .from("pages")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    const now = new Date().toISOString();
    const allFields: Record<string, unknown> = {
      user_id: user.id,
      owner_id: user.id,
      slug: username,
      status: "live",
      visibility: "public",
      title: body.title || "My Living Page",
      theme_id: body.theme_id,
      resume_data: body.resume_data,
      raw_resume: body.raw_resume ?? "",
      page_config: body.page_config ?? {},
      published_at: now,
    };

    const { error } = await supabase
      .from("pages")
      .upsert(allFields, { onConflict: "owner_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await trackEvent(user.id, "page.publish", {
      theme_id: body.theme_id,
      slug: username,
      is_update: Boolean(existing?.id),
    });

    return NextResponse.json({ slug: username });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 },
    );
  }
}
