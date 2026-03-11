import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pageId?: string };
    if (!body.pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    const authClient = createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const supabase = createServiceRoleSupabaseClient();
    const { data: page } = await supabase
      .from("pages")
      .select("id, user_id, owner_id, status, visibility")
      .eq("id", body.pageId)
      .maybeSingle();

    if (!page || (page.status !== "live" && page.visibility !== "public")) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const pageOwnerId = page.owner_id ?? page.user_id ?? null;
    if (user?.id && pageOwnerId === user.id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const headersList = await headers();
    const rawIp =
      headersList.get("x-real-ip") ??
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const hashedIp = createHash("sha256").update(rawIp).digest("hex");
    const country = headersList.get("x-vercel-ip-country") ?? null;

    const dedupeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentViewCount } = await supabase
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .eq("page_id", body.pageId)
      .eq("viewer_ip", hashedIp)
      .gte("viewed_at", dedupeCutoff);

    if ((recentViewCount ?? 0) > 0) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    await supabase.from("page_views").insert({
      page_id: body.pageId,
      viewer_ip: hashedIp,
      referrer: headersList.get("referer"),
      user_agent: headersList.get("user-agent"),
      country,
    });

    await supabase.rpc("increment_page_views", { page_id: body.pageId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to track view." }, { status: 500 });
  }
}
