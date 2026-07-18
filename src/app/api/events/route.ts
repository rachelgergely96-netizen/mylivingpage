import { NextResponse } from "next/server";
import {
  SHARE_INTENT_EVENT_NAMES,
  type ShareIntentEventName,
  type ShareScenario,
} from "@/lib/analytics/proofSummary";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { recordEvent } from "@/lib/track-event";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

const routeTrustLevel = "authenticated_user";
const MAX_EVENT_BODY_BYTES = 16 * 1024;
const ALLOWED_SCENARIOS = new Set<ShareScenario>([
  "application_follow_up",
  "recruiter_reply",
  "connection",
]);
const ALLOWED_METADATA_KEYS = new Set([
  "page_id",
  "slug",
  "scenario",
  "surface",
  "mode",
  "variant_id",
  "variant_label",
  "share_link_id",
  "share_path",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedEventName(value: string): value is ShareIntentEventName {
  return SHARE_INTENT_EVENT_NAMES.includes(value as ShareIntentEventName);
}

function optionalBoundedString(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
}

function sanitizeMetadata(value: unknown) {
  if (!isPlainObject(value)) {
    return null;
  }

  if (Object.keys(value).some((key) => !ALLOWED_METADATA_KEYS.has(key))) {
    return null;
  }

  const pageId = optionalBoundedString(value.page_id, 64);
  if (!pageId || !/^[a-z0-9-]+$/i.test(pageId)) {
    return null;
  }

  const scenario = optionalBoundedString(value.scenario, 40);
  // undefined means present-but-malformed (wrong type / over length); reject it
  // like the other bounded fields instead of silently discarding the value.
  if (scenario === undefined) {
    return null;
  }
  if (scenario && !ALLOWED_SCENARIOS.has(scenario as ShareScenario)) {
    return null;
  }

  const boundedFields = {
    slug: optionalBoundedString(value.slug, 80),
    surface: optionalBoundedString(value.surface, 40),
    mode: optionalBoundedString(value.mode, 40),
    variant_id: optionalBoundedString(value.variant_id, 80),
    variant_label: optionalBoundedString(value.variant_label, 120),
    share_link_id: optionalBoundedString(value.share_link_id, 80),
    share_path: optionalBoundedString(value.share_path, 400),
  };

  if (Object.values(boundedFields).some((field) => field === undefined)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries({
      page_id: pageId,
      scenario,
      ...boundedFields,
    }).filter(([, field]) => field !== null),
  );
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_EVENT_BODY_BYTES) {
    return NextResponse.json({ error: "Event payload is too large." }, { status: 413 });
  }

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { eventName?: unknown; metadata?: unknown }
    | null;

  const eventName = typeof body?.eventName === "string" ? body.eventName.trim() : "";
  const metadata = sanitizeMetadata(body?.metadata);

  if (!isAllowedEventName(eventName)) {
    return NextResponse.json({ error: "Invalid event name." }, { status: 400 });
  }
  if (!metadata) {
    return NextResponse.json({ error: "Invalid event metadata." }, { status: 400 });
  }

  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "client_event",
      route: "/api/events",
      userId: user.id,
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }
  } catch {
    return NextResponse.json(
      { error: "Event tracking is temporarily unavailable." },
      { status: 503 },
    );
  }

  const supabase = createServiceRoleSupabaseClient();
  const { data: ownedPage, error: pageError } = await supabase
    .from("pages")
    .select("id")
    .eq("id", metadata.page_id)
    .or(`owner_id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle<{ id: string }>();

  if (pageError) {
    return NextResponse.json(
      { error: "Event tracking is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!ownedPage) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const recorded = await recordEvent(user.id, eventName, metadata);
  if (!recorded) {
    return NextResponse.json(
      { error: "Event tracking is temporarily unavailable." },
      { status: 503 },
    );
  }
  return NextResponse.json({ success: true });
}
