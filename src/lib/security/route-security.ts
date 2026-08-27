import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RouteTrustLevel =
  | "public_read"
  | "public_write"
  | "authenticated_user"
  | "admin_only"
  | "signed_webhook";

export type RouteMethod =
  | "GET"
  | "POST"
  | "PATCH"
  | "PUT"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export type RouteTrustMap = Partial<Record<RouteMethod, RouteTrustLevel>>;

export const ROUTE_TRUST_LEVELS: RouteTrustLevel[] = [
  "public_read",
  "public_write",
  "authenticated_user",
  "admin_only",
  "signed_webhook",
];

export function isRouteTrustLevel(value: string): value is RouteTrustLevel {
  return ROUTE_TRUST_LEVELS.includes(value as RouteTrustLevel);
}

interface RouteGuardSuccess<T> {
  value: T;
}

interface RouteGuardFailure {
  response: NextResponse<{ error: string }>;
}

export type RouteGuardResult<T> = RouteGuardSuccess<T> | RouteGuardFailure;

export interface AuthenticatedRouteUser {
  id: string;
  email?: string | null;
}

export async function requireAuthenticatedUser(): Promise<
  RouteGuardResult<{
    authClient: Awaited<ReturnType<typeof createServerSupabaseClient>>;
    user: AuthenticatedRouteUser;
  }>
> {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Your session has expired. Sign in again to continue." },
        { status: 401 },
      ),
    };
  }

  return {
    value: {
      authClient,
      user,
    },
  };
}

export async function requireAdminUser(): Promise<
  RouteGuardResult<{
    authClient: Awaited<ReturnType<typeof createServerSupabaseClient>>;
    user: AuthenticatedRouteUser;
  }>
> {
  const authResult = await requireAuthenticatedUser();
  if ("response" in authResult) {
    return authResult;
  }

  if (!isAdminEmail(authResult.value.user.email)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return authResult;
}

interface SignedWebhookSuccess<T> {
  value: {
    payload: string;
    verified: T;
    signature: string;
  };
}

type SignedWebhookResult<T> = SignedWebhookSuccess<T> | RouteGuardFailure;

const SIGNED_WEBHOOK_REJECTION_MESSAGE = "Webhook request rejected.";

type LimitedWebhookBody =
  | { ok: true; payload: string }
  | { ok: false; tooLarge: boolean };

function signedWebhookFailure(status: 400 | 413 | 500): RouteGuardFailure {
  return {
    response: NextResponse.json(
      { error: SIGNED_WEBHOOK_REJECTION_MESSAGE },
      { status },
    ),
  };
}

async function readWebhookBodyWithinLimit(
  request: Request,
  maxBodyBytes: number,
): Promise<LimitedWebhookBody> {
  if (!request.body) {
    return { ok: true, payload: "" };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let payload = "";
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return { ok: true, payload: payload + decoder.decode() };
      }

      bytesRead += value.byteLength;
      if (bytesRead > maxBodyBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, tooLarge: true };
      }
      payload += decoder.decode(value, { stream: true });
    }
  } catch {
    return { ok: false, tooLarge: false };
  }
}

export async function assertSignedWebhook<T>(input: {
  request: Request;
  secret: string | null | undefined;
  signatureHeaderName: string;
  maxBodyBytes: number;
  maxSignatureLength?: number;
  verify: (payload: string, signature: string, secret: string) => T;
}): Promise<SignedWebhookResult<T>> {
  const signature = input.request.headers.get(input.signatureHeaderName);
  if (
    !signature ||
    signature.length > (input.maxSignatureLength ?? 8 * 1024)
  ) {
    return signedWebhookFailure(400);
  }

  if (!input.secret) {
    return signedWebhookFailure(500);
  }

  const declaredLengthHeader = input.request.headers.get("content-length");
  const declaredLength = Number(declaredLengthHeader);
  if (
    declaredLengthHeader !== null &&
    Number.isFinite(declaredLength) &&
    declaredLength > input.maxBodyBytes
  ) {
    return signedWebhookFailure(413);
  }

  const body = await readWebhookBodyWithinLimit(
    input.request,
    input.maxBodyBytes,
  );
  if (!body.ok) {
    return signedWebhookFailure(body.tooLarge ? 413 : 400);
  }

  try {
    return {
      value: {
        payload: body.payload,
        verified: input.verify(body.payload, signature, input.secret),
        signature,
      },
    };
  } catch {
    return signedWebhookFailure(400);
  }
}
