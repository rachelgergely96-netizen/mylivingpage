const LOCAL_ADMIN_EMAIL = "rachelgergely96@gmail.com";

interface AdminEnvironment {
  ADMIN_EMAIL?: string;
  NODE_ENV?: string;
}

export function resolveAdminEmail(environment: AdminEnvironment) {
  return (
    environment.ADMIN_EMAIL ??
    (environment.NODE_ENV === "production" ? "" : LOCAL_ADMIN_EMAIL)
  )
    .trim()
    .toLowerCase();
}

export const ADMIN_EMAIL = resolveAdminEmail({
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  NODE_ENV: process.env.NODE_ENV,
});

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(ADMIN_EMAIL && email?.trim().toLowerCase() === ADMIN_EMAIL);
}
