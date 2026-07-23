import { NextResponse } from "next/server";
import { sanitizeInternalRedirectPath } from "@/lib/auth/internal-redirect";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requireAuthenticatedUser } from "@/lib/security/route-security";
import { recordEvent } from "@/lib/track-event";

const ALLOWED_TYPES = ["bug", "feature", "general"] as const;
type FeedbackType = (typeof ALLOWED_TYPES)[number];
const routeTrustLevel = "authenticated_user";
const MAX_FEEDBACK_BODY_BYTES = 8 * 1024;

async function readRequestBodyWithinLimit(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return body + decoder.decode();
    }

    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FEEDBACK_BODY_BYTES) {
    return NextResponse.json({ error: "Feedback request is too large" }, { status: 413 });
  }

  const authResult = await requireAuthenticatedUser();
  if ("response" in authResult) {
    return authResult.response;
  }
  const { user } = authResult.value;

  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "feedback_submit",
      route: "/api/feedback",
      userId: user.id,
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }
  } catch {
    return NextResponse.json(
      { error: "Feedback is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }

  let message = "";
  let type: FeedbackType = "general";
  let page = "";

  try {
    const rawBody = await readRequestBodyWithinLimit(
      request,
      MAX_FEEDBACK_BODY_BYTES,
    );
    if (rawBody === null) {
      return NextResponse.json(
        { error: "Feedback request is too large" },
        { status: 413 },
      );
    }

    const body = JSON.parse(rawBody) as {
      message?: unknown;
      type?: unknown;
      page?: unknown;
    };
    message = typeof body.message === "string" ? body.message.trim() : "";
    type = ALLOWED_TYPES.includes(body.type as FeedbackType) ? (body.type as FeedbackType) : "general";
    page =
      typeof body.page === "string"
        ? sanitizeInternalRedirectPath(body.page.trim().slice(0, 200), "")
        : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
  }

  const recorded = await recordEvent(user.id, "feedback.submitted", {
    message,
    type,
    page,
  });
  if (!recorded) {
    return NextResponse.json(
      { error: "Feedback could not be saved. Please try again." },
      { status: 503 },
    );
  }

  return NextResponse.json({ success: true });
}
