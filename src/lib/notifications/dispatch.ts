import type { SupabaseClient } from "@supabase/supabase-js";
import { isAnalyticsSectionId } from "@/lib/analytics/constants";
import { parseReferrerLabel } from "@/lib/analytics/pageAnalytics";
import { LIVING_PAGE_SECTION_LABELS } from "@/lib/living-page-sections";
import { ensureNotificationPreferences } from "@/lib/notifications/preferences";
import {
  isEmailDeliveryConfigured,
  sendTransactionalEmail,
} from "@/lib/notifications/provider";
import {
  buildFirstViewEmail,
  buildRepeatVisitorEmail,
} from "@/lib/notifications/templates";
import { describeViewQuality, isQualifiedView } from "@/lib/notifications/qualified-view";
import { absoluteUrl } from "@/lib/site";
import { trackEvent } from "@/lib/track-event";

export type ViewNotificationKind = "first_view" | "repeat_visitor";

export type ViewNotificationOutcome =
  | "sent"
  | "not_qualified"
  | "already_notified"
  | "muted"
  | "throttled"
  | "no_recipient"
  | "unavailable";

/** Ceiling on view notifications per page per hour. */
export const MAX_NOTIFICATIONS_PER_PAGE_PER_HOUR = 8;

async function hasReachedHourlyNotificationCap(
  supabase: SupabaseClient,
  pageId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId)
    .gte("notified_at", since);

  if (error) {
    // Fail closed: an unreadable counter must not become an open tap.
    return true;
  }

  return (count ?? 0) >= MAX_NOTIFICATIONS_PER_PAGE_PER_HOUR;
}

interface PageViewNotificationRow {
  id: string;
  page_id: string;
  viewer_ip: string | null;
  viewed_at: string;
  referrer: string | null;
  engaged_seconds: number | null;
  max_scroll_depth_pct: number | null;
  primary_section: string | null;
  had_outbound_click: boolean | null;
  notified_at: string | null;
}

function sectionLabel(primarySection: string | null): string | null {
  if (!isAnalyticsSectionId(primarySection)) {
    return null;
  }

  return LIVING_PAGE_SECTION_LABELS[primarySection] ?? null;
}

/**
 * Decide and deliver the "someone opened your page" notification for one view.
 *
 * Called from the engagement beacon rather than the view insert: dwell is what
 * separates a person from a headless link scanner, and dwell only exists by the
 * time engagement reports. See `qualified-view.ts`.
 *
 * Never throws — analytics and notification work must not break page tracking.
 */
export async function dispatchViewNotification(
  supabase: SupabaseClient,
  pageViewId: string,
): Promise<ViewNotificationOutcome> {
  try {
    const { data: viewRow } = await supabase
      .from("page_views")
      .select(
        "id, page_id, viewer_ip, viewed_at, referrer, engaged_seconds, max_scroll_depth_pct, primary_section, had_outbound_click, notified_at",
      )
      .eq("id", pageViewId)
      .maybeSingle();

    const view = viewRow as PageViewNotificationRow | null;
    if (!view) {
      return "unavailable";
    }

    if (view.notified_at) {
      return "already_notified";
    }

    if (
      !isQualifiedView({
        engagedSeconds: view.engaged_seconds,
        maxScrollDepthPct: view.max_scroll_depth_pct,
        hadOutboundClick: view.had_outbound_click,
      })
    ) {
      return "not_qualified";
    }

    const { data: pageRow } = await supabase
      .from("pages")
      .select("id, slug, owner_id, user_id, page_config")
      .eq("id", view.page_id)
      .maybeSingle();

    const page = pageRow as {
      id: string;
      slug: string;
      owner_id: string | null;
      user_id: string | null;
      page_config: Record<string, unknown> | null;
    } | null;

    const ownerId = page?.owner_id ?? page?.user_id ?? null;
    if (!page || !ownerId) {
      return "unavailable";
    }

    // A prior view row from the same hashed IP means this person has been here
    // before. `page_views` is deduped to one row per IP per page per 24h, so an
    // earlier row is a genuinely separate visit, not a reload.
    let kind: ViewNotificationKind = "first_view";
    if (view.viewer_ip) {
      const { count } = await supabase
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .eq("page_id", view.page_id)
        .eq("viewer_ip", view.viewer_ip)
        .lt("viewed_at", view.viewed_at);

      if ((count ?? 0) > 0) {
        kind = "repeat_visitor";
      }
    }

    const preferences = await ensureNotificationPreferences(supabase, ownerId);
    if (!preferences) {
      return "unavailable";
    }

    const wanted =
      kind === "repeat_visitor"
        ? preferences.repeat_visitor_email
        : preferences.first_view_email;

    if (!wanted) {
      return "muted";
    }

    // Engagement payloads are client-supplied, so a forged beacon against a
    // known page-view id can manufacture a "qualified" read. IP rate limits and
    // the 24h view dedupe bound how many view rows an attacker can create; this
    // caps what any of them can turn into mail, so a page owner's inbox cannot
    // be used to harass them.
    if (await hasReachedHourlyNotificationCap(supabase, page.id)) {
      await trackEvent(ownerId, "page.notification.throttled", {
        page_id: page.id,
        page_view_id: view.id,
        kind,
      });
      return "throttled";
    }

    // Claiming commits us to sending, so bail before the claim when no delivery
    // can happen at all — otherwise the row is burned with nothing sent.
    if (!isEmailDeliveryConfigured()) {
      return "unavailable";
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("email, full_name, username")
      .eq("id", ownerId)
      .maybeSingle();

    const profile = profileRow as {
      email: string | null;
      full_name: string | null;
      username: string | null;
    } | null;

    if (!profile?.email) {
      return "no_recipient";
    }

    // Claim the row before sending. Engagement fires on both click and pagehide,
    // so two beacons can race here; the conditional update lets exactly one win.
    const { data: claimed } = await supabase
      .from("page_views")
      .update({
        notified_at: new Date().toISOString(),
        notification_kind: kind,
      })
      .eq("id", view.id)
      .is("notified_at", null)
      .select("id");

    if (!claimed || claimed.length === 0) {
      return "already_notified";
    }

    const slug = profile.username ?? page.slug;
    const pageUrl = absoluteUrl(`/${slug}`);
    const analyticsUrl = absoluteUrl(`/dashboard/analytics/${page.id}`);
    const preferencesUrl = absoluteUrl("/dashboard/settings#notifications");
    const unsubscribeUrl = absoluteUrl(
      `/api/notifications/unsubscribe?token=${preferences.unsubscribe_token}`,
    );

    const qualityLine = describeViewQuality({
      engagedSeconds: view.engaged_seconds,
      maxScrollDepthPct: view.max_scroll_depth_pct,
      hadOutboundClick: view.had_outbound_click,
      primarySectionLabel: sectionLabel(view.primary_section),
    });

    const input = {
      ownerName: profile.full_name,
      pageUrl,
      analyticsUrl,
      preferencesUrl,
      unsubscribeUrl,
      qualityLine,
      referrerLabel: view.referrer ? parseReferrerLabel(view.referrer) : null,
    };

    const email =
      kind === "repeat_visitor"
        ? buildRepeatVisitorEmail(input)
        : buildFirstViewEmail(input);

    const result = await sendTransactionalEmail({
      to: profile.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      unsubscribeUrl,
    });

    // A provider outage must not silently eat the notification: release the
    // claim so a later beacon for the same view can retry. Re-sending needs the
    // send to have succeeded *and* its response to have failed, which is far
    // rarer than a transient outage.
    if (result.status !== "sent") {
      await supabase
        .from("page_views")
        .update({ notified_at: null, notification_kind: null })
        .eq("id", view.id);
    }

    await trackEvent(ownerId, `page.notification.${kind}`, {
      page_id: page.id,
      page_view_id: view.id,
      delivery: result.status,
      reason: result.reason ?? null,
    });

    return result.status === "sent" ? "sent" : "unavailable";
  } catch {
    return "unavailable";
  }
}
