interface HostingManagedPage {
  id: string;
  owner_id?: string | null;
  user_id?: string | null;
  status?: string | null;
  visibility?: string | null;
}

export function isPubliclyAvailablePage(
  page:
    | Pick<HostingManagedPage, "status" | "visibility">
    | null
    | undefined,
) {
  return Boolean(
    page &&
      page.status === "live" &&
      (page.visibility === "public" || page.visibility == null),
  );
}
