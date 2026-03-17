import { NextResponse } from "next/server";
import { ADMIN_EMAIL } from "@/lib/admin";
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
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
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

  if (authResult.value.user.email !== ADMIN_EMAIL) {
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

export async function assertSignedWebhook<T>(input: {
  request: Request;
  secret: string | null | undefined;
  signatureHeaderName: string;
  verify: (payload: string, signature: string, secret: string) => T;
}): Promise<SignedWebhookResult<T>> {
  const signature = input.request.headers.get(input.signatureHeaderName);
  if (!signature) {
    return {
      response: NextResponse.json({ error: "Missing signature" }, { status: 400 }),
    };
  }

  if (!input.secret) {
    return {
      response: NextResponse.json({ error: "Missing webhook secret" }, { status: 500 }),
    };
  }

  const payload = await input.request.text();

  try {
    return {
      value: {
        payload,
        verified: input.verify(payload, signature, input.secret),
        signature,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook signature verification failed.";
    return {
      response: NextResponse.json(
        { error: `Webhook signature verification failed: ${message}` },
        { status: 400 },
      ),
    };
  }
}
