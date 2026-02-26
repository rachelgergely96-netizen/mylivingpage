import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pageId?: string };
    if (!body.pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const headersList = headers();
    const rawIp =
      headersList.get("x-real-ip") ??
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const hashedIp = createHash("sha256").update(rawIp).digest("hex");

    await supabase.from("page_views").insert({
      page_id: body.pageId,
      viewer_ip: hashedIp,
      referrer: headersList.get("referer"),
      user_agent: headersList.get("user-agent"),
    });

    const { data: currentPage } = await supabase.from("pages").select("views").eq("id", body.pageId).maybeSingle();
    const nextViews = (currentPage?.views ?? 0) + 1;
    await supabase.from("pages").update({ views: nextViews }).eq("id", body.pageId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to track view." }, { status: 500 });
  }
}
