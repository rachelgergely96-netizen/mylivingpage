import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/observability";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const routeTrustLevel = "public_write";

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "client_error",
      route: "/api/errors",
    });
    if (rateLimit.limited) return rateLimit.response;
  } catch (error) {
    reportServerError("client_error.rate_limit_unavailable", error, { route: "/api/errors" });
    return NextResponse.json({ error: "Error reporting unavailable." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body as { message?: unknown; digest?: unknown; path?: unknown };
  const message = typeof payload.message === "string" ? payload.message.slice(0, 500) : "Client error";
  const digest = typeof payload.digest === "string" ? payload.digest.slice(0, 100) : null;
  const path = typeof payload.path === "string" && payload.path.startsWith("/")
    ? payload.path.slice(0, 300)
    : null;

  reportServerError("client.global_error", new Error(message), {
    digest,
    path,
    requestId: request.headers.get("x-vercel-id"),
  });
  return new NextResponse(null, { status: 204 });
}
