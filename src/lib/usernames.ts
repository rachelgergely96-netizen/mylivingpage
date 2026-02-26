export function slugifyUsername(source: string): string {
  const value = source
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\-_]+|[.\-_]+$/g, "");

  return value || "member";
}

export function usernameFromEmail(email: string | null | undefined): string {
  if (!email) {
    return "member";
  }
  return slugifyUsername(email.split("@")[0]);
}
