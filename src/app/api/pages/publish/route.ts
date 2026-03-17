import { NextResponse } from "next/server";
import { FREE_THEMES, isPremiumPlan, isPremiumTheme } from "@/lib/plans";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import { usernameFromEmail } from "@/lib/usernames";

export const routeTrustLevel = "authenticated_user";

interface PublishBody {
  title: string;
  theme_id: string;
  resume_data: unknown;
  raw_resume: string;
  page_config?: Record<string, unknown>;
}

async function persistPageRecord(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  userId: string,
  fields: Record<string, unknown>,
) {
  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  const { error } = await supabase.from("pages").upsert(fields, { onConflict: "owner_id" });
  return { error, existingId: existing?.id ?? null };
}

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
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

    const { error, existingId } = await persistPageRecord(supabase, user.id, allFields);

    if (error) {
      await trackEvent(user.id, "page.publish.failed", {
        slug: username,
        theme_id: body.theme_id,
        error: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await trackEvent(user.id, "page.publish", {
      theme_id: body.theme_id,
      slug: username,
      is_update: Boolean(existingId),
    });

    return NextResponse.json({ slug: username });
  } catch (err) {
    await trackEvent(null, "page.publish.failed", {
      error: err instanceof Error ? err.message : "Publish failed",
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 },
    );
  }
}
