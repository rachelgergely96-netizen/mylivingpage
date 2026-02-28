import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

interface PublishBody {
  slug: string;
  title: string;
  theme_id: string;
  resume_data: unknown;
  raw_resume: string;
  page_config?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    // Authenticate the caller via session cookies
    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<PublishBody>;
    if (!body.slug || !body.theme_id || !body.resume_data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use service-role client to bypass RLS
    const supabase = createServiceRoleSupabaseClient();

    // Check for existing page by owner_id + slug OR user_id + slug
    const { data: existing } = await supabase
      .from("pages")
      .select("id")
      .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
      .eq("slug", body.slug)
      .limit(1)
      .maybeSingle();

    const pageFields = {
      user_id: user.id,
      owner_id: user.id,
      slug: body.slug,
      status: "live",
      visibility: "public",
      title: body.title || "My Living Page",
      theme_id: body.theme_id,
      resume_data: body.resume_data,
      raw_resume: body.raw_resume ?? "",
      page_config: body.page_config ?? {},
      published_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from("pages")
        .update(pageFields)
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("pages").insert(pageFields);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ slug: body.slug });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 },
    );
  }
}
