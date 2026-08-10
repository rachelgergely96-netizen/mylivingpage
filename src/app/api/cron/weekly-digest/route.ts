import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  DIGEST_RANGE_LABEL,
  buildDigestSummary,
  digestEligibilityCutoff,
  digestWindowStart,
  type DigestViewRow,
} from "@/lib/notifications/digest";
import { sendTransactionalEmail } from "@/lib/notifications/provider";
import { buildWeeklyDigestEmail } from "@/lib/notifications/templates";
import { absoluteUrl } from "@/lib/site";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shares the webhook trust model: no session, authorised by a shared secret in
// the Authorization header and compared in constant time.
const routeTrustLevel = "signed_webhook";

/** Bounded per run so one invocation can't exceed the function time limit. */
const MAX_DIGESTS_PER_RUN = 200;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const headerBytes = Buffer.from(header);
  const expectedBytes = Buffer.from(expected);
  if (headerBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(headerBytes, expectedBytes);
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const now = new Date();
  const supabase = createServiceRoleSupabaseClient();
  const eligibilityCutoff = digestEligibilityCutoff(now).toISOString();

  const { data: candidates, error: candidatesError } = await supabase
    .from("notification_preferences")
    .select("user_id, unsubscribe_token, last_digest_sent_at")
    .eq("weekly_digest_email", true)
    .or(`last_digest_sent_at.is.null,last_digest_sent_at.lt.${eligibilityCutoff}`)
    .limit(MAX_DIGESTS_PER_RUN);

  if (candidatesError) {
    return NextResponse.json(
      { error: "Unable to load digest recipients." },
      { status: 503 },
    );
  }

  const windowStart = digestWindowStart(now).toISOString();
  let sent = 0;
  let skipped = 0;

  for (const candidate of candidates ?? []) {
    try {
      // Claim before sending. A retried or overlapping cron run would otherwise
      // re-select the same recipients and mail them twice; the conditional
      // update lets exactly one run win each recipient.
      const { data: claimed } = await supabase
        .from("notification_preferences")
        .update({ last_digest_sent_at: now.toISOString() })
        .eq("user_id", candidate.user_id)
        .or(
          `last_digest_sent_at.is.null,last_digest_sent_at.lt.${eligibilityCutoff}`,
        )
        .select("user_id");

      if (!claimed || claimed.length === 0) {
        skipped += 1;
        continue;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, username")
        .eq("id", candidate.user_id)
        .maybeSingle();

      if (!profile?.email) {
        skipped += 1;
        continue;
      }

      const { data: page } = await supabase
        .from("pages")
        .select("id, slug")
        .or(`owner_id.eq.${candidate.user_id},user_id.eq.${candidate.user_id}`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!page) {
        skipped += 1;
        continue;
      }

      const { data: views } = await supabase
        .from("page_views")
        .select("viewer_ip, referrer, had_outbound_click")
        .eq("page_id", page.id)
        .gte("viewed_at", windowStart);

      const summary = buildDigestSummary({
        pageUrl: absoluteUrl(`/${profile.username ?? page.slug}`),
        views: (views ?? []) as DigestViewRow[],
      });

      const unsubscribeUrl = absoluteUrl(
        `/api/notifications/unsubscribe?token=${candidate.unsubscribe_token}`,
      );
      const email = buildWeeklyDigestEmail({
        ownerName: profile.full_name,
        analyticsUrl: absoluteUrl(`/dashboard/analytics/${page.id}`),
        preferencesUrl: absoluteUrl("/dashboard/settings#notifications"),
        unsubscribeUrl,
        rangeLabel: DIGEST_RANGE_LABEL,
        summary,
      });

      const result = await sendTransactionalEmail({
        to: profile.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        unsubscribeUrl,
      });

      // The claim above already stamped `last_digest_sent_at`, so a provider
      // outage costs one skipped weekly digest rather than a retry storm
      // against the same recipients on the next run.
      if (result.status === "sent") {
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    considered: candidates?.length ?? 0,
    sent,
    skipped,
  });
}
