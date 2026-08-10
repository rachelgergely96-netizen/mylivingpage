import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/site";

/**
 * Token-authenticated unsubscribe. The token is the credential — these requests
 * arrive from a mail client with no session, and `unsubscribe_token` is revoked
 * from browser roles so it can only reach a recipient by email.
 *
 * GET serves the human link in the footer; POST serves RFC 8058 one-click,
 * which mail providers fire without rendering anything.
 */

const routeTrustLevel = "public_write";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function muteAllEmails(token: string): Promise<boolean> {
  if (!UUID_PATTERN.test(token)) {
    return false;
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase
      .from("notification_preferences")
      .update({
        first_view_email: false,
        repeat_visitor_email: false,
        weekly_digest_email: false,
      })
      .eq("unsubscribe_token", token)
      .select("user_id");

    return !error && Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

function resultPage(ok: boolean): Response {
  const settingsUrl = absoluteUrl("/dashboard/settings#notifications");
  const body = ok
    ? `<h1>You're unsubscribed</h1>
       <p>You won't get page-view emails from MyLivingPage anymore.</p>
       <p>Your page and its analytics are untouched — you can still see every view in your dashboard, and turn individual emails back on whenever you want.</p>
       <p><a href="${settingsUrl}">Notification settings</a></p>`
    : `<h1>That link didn't work</h1>
       <p>This unsubscribe link is no longer valid. You can change every email setting directly in your dashboard.</p>
       <p><a href="${settingsUrl}">Notification settings</a></p>`;

  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />
     <meta name="viewport" content="width=device-width,initial-scale=1" />
     <meta name="robots" content="noindex" />
     <title>${ok ? "Unsubscribed" : "Link expired"} · MyLivingPage</title>
     <style>
       body{margin:0;padding:48px 24px;background:#f6f6f4;color:#1a1a1a;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;}
       main{max-width:34rem;margin:0 auto;background:#fff;border:1px solid #e2e2dd;padding:32px;}
       h1{font-size:1.4rem;margin:0 0 16px;}
       p{font-size:0.95rem;line-height:1.65;margin:0 0 12px;color:#4a4a45;}
       a{color:#1a1a1a;}
     </style></head><body><main>${body}</main></body></html>`,
    {
      status: ok ? 200 : 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return resultPage(await muteAllEmails(token));
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await muteAllEmails(token);

  // One-click clients do not render a body; they only read the status.
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
