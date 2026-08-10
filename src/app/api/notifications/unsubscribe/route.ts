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

function htmlPage(title: string, body: string, status: number): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />
     <meta name="viewport" content="width=device-width,initial-scale=1" />
     <meta name="robots" content="noindex" />
     <title>${title} · MyLivingPage</title>
     <style>
       body{margin:0;padding:48px 24px;background:#f6f6f4;color:#1a1a1a;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;}
       main{max-width:34rem;margin:0 auto;background:#fff;border:1px solid #e2e2dd;padding:32px;}
       h1{font-size:1.4rem;margin:0 0 16px;}
       p{font-size:0.95rem;line-height:1.65;margin:0 0 12px;color:#4a4a45;}
       a{color:#1a1a1a;}
       button{margin-top:8px;background:#1a1a1a;color:#fff;border:0;padding:11px 18px;
              font-size:0.9rem;font-weight:600;cursor:pointer;}
     </style></head><body><main>${body}</main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

function settingsLink() {
  return absoluteUrl("/dashboard/settings#notifications");
}

/**
 * GET only *offers* to unsubscribe; it never mutates.
 *
 * The same corporate link scanners this feature exists to ignore on the view
 * path also prefetch links in email bodies. A GET that muted on sight would let
 * them silently unsubscribe owners who never clicked anything.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";

  if (!UUID_PATTERN.test(token)) {
    return htmlPage(
      "Link expired",
      `<h1>That link didn't work</h1>
       <p>This unsubscribe link is no longer valid. You can change every email setting directly in your dashboard.</p>
       <p><a href="${settingsLink()}">Notification settings</a></p>`,
      400,
    );
  }

  const action = `/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
  return htmlPage(
    "Unsubscribe",
    `<h1>Turn off page-view emails?</h1>
     <p>You'll stop getting emails when someone opens your page, when someone comes back, and the weekly summary.</p>
     <p>Your page and its analytics are untouched — every view stays visible in your dashboard.</p>
     <form method="post" action="${action}">
       <button type="submit">Turn off these emails</button>
     </form>
     <p style="margin-top:20px;"><a href="${settingsLink()}">Choose individually instead</a></p>`,
    200,
  );
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await muteAllEmails(token);

  // RFC 8058 one-click clients read only the status code; a person arriving via
  // the confirmation form above needs the page.
  const wantsHtml = (request.headers.get("accept") ?? "").includes("text/html");
  if (!wantsHtml) {
    return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
  }

  return ok
    ? htmlPage(
        "Unsubscribed",
        `<h1>You're unsubscribed</h1>
         <p>You won't get page-view emails from MyLivingPage anymore.</p>
         <p>Your page and its analytics are untouched — you can turn individual emails back on whenever you want.</p>
         <p><a href="${settingsLink()}">Notification settings</a></p>`,
        200,
      )
    : htmlPage(
        "Link expired",
        `<h1>That link didn't work</h1>
         <p>This unsubscribe link is no longer valid. You can change every email setting directly in your dashboard.</p>
         <p><a href="${settingsLink()}">Notification settings</a></p>`,
        400,
      );
}
