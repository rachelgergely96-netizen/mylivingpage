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

    // Find existing page — try multiple strategies since schema varies
    let existingId: string | null = null;

    // Strategy 1: search by owner_id
    const { data: byOwner } = await supabase
      .from("pages")
      .select("id")
      .eq("owner_id", user.id)
      .eq("slug", body.slug)
      .limit(1)
      .maybeSingle();

    existingId = byOwner?.id ?? null;

    // Strategy 2: search by user_id if owner_id didn't match
    if (!existingId) {
      const { data: byUser } = await supabase
        .from("pages")
        .select("id")
        .eq("user_id", user.id)
        .eq("slug", body.slug)
        .limit(1)
        .maybeSingle();

      existingId = byUser?.id ?? null;
    }

    // Build fields — include everything, unknown columns are silently ignored by Supabase
    const now = new Date().toISOString();
    const allFields: Record<string, unknown> = {
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
      published_at: now,
    };

    if (existingId) {
      // Update existing page
      const { error } = await supabase
        .from("pages")
        .update(allFields)
        .eq("id", existingId);

      if (error) {
        // If update fails (maybe unknown columns), try with minimal fields
        const { error: retryErr } = await supabase
          .from("pages")
          .update({
            status: "live",
            theme_id: body.theme_id,
            resume_data: body.resume_data,
            raw_resume: body.raw_resume ?? "",
            page_config: body.page_config ?? {},
            published_at: now,
          })
          .eq("id", existingId);

        if (retryErr) {
          return NextResponse.json({ error: retryErr.message }, { status: 500 });
        }
      }
    } else {
      // Fresh insert
      const { error } = await supabase.from("pages").insert(allFields);

      if (error) {
        // Retry with MVP-only columns
        const { error: retryErr } = await supabase.from("pages").insert({
          user_id: user.id,
          slug: body.slug,
          status: "live",
          theme_id: body.theme_id,
          resume_data: body.resume_data,
          raw_resume: body.raw_resume ?? "",
          page_config: body.page_config ?? {},
          published_at: now,
        });

        if (retryErr) {
          return NextResponse.json({ error: retryErr.message }, { status: 500 });
        }
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
