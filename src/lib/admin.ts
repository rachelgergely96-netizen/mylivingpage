const LOCAL_ADMIN_EMAIL = "rachelgergely96@gmail.com";

export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ??
  (process.env.NODE_ENV === "production" ? "" : LOCAL_ADMIN_EMAIL)
)
  .trim()
  .toLowerCase();

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(ADMIN_EMAIL && email?.trim().toLowerCase() === ADMIN_EMAIL);
}
