const RECENT_AUTH_WINDOW_MS = 10 * 60 * 1000;

interface ReauthenticationUser {
  email?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: { providers?: unknown };
}

interface PasswordAuthClient {
  auth: {
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      error: { message?: string } | null;
    }>;
  };
}

export type ReauthenticationResult =
  | { ok: true }
  | { ok: false; status: 400 | 403; error: string; code: "CURRENT_PASSWORD_REQUIRED" | "REAUTH_REQUIRED" };

export async function requireRecentReauthentication(
  client: PasswordAuthClient,
  user: ReauthenticationUser,
  currentPassword: unknown,
  now = Date.now(),
): Promise<ReauthenticationResult> {
  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.filter((provider): provider is string => typeof provider === "string")
    : [];
  const hasPassword = providers.includes("email");

  if (hasPassword) {
    if (!user.email || typeof currentPassword !== "string" || currentPassword.length === 0) {
      return {
        ok: false,
        status: 400,
        error: "Enter your current password to continue.",
        code: "CURRENT_PASSWORD_REQUIRED",
      };
    }
    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (error) {
      return {
        ok: false,
        status: 403,
        error: "The current password is incorrect.",
        code: "REAUTH_REQUIRED",
      };
    }
    return { ok: true };
  }

  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : Number.NaN;
  if (!Number.isFinite(lastSignIn) || now - lastSignIn > RECENT_AUTH_WINDOW_MS) {
    return {
      ok: false,
      status: 403,
      error: "For your security, sign out and sign in with your provider again before continuing.",
      code: "REAUTH_REQUIRED",
    };
  }
  return { ok: true };
}
