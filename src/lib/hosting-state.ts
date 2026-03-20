import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAccountAccessState,
  type AccountAccessInput,
  type AccountAccessState,
} from "@/lib/account-access";

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
      (page.visibility === "public" ||
        (page.visibility == null && page.status === "live")),
  );
}

export async function syncPageHostingState<
  TPage extends HostingManagedPage,
>(
  supabase: SupabaseClient,
  page: TPage,
  profile: AccountAccessInput,
): Promise<{ page: TPage; access: AccountAccessState; changed: boolean }> {
  const access = getAccountAccessState(profile);

  if (!isPubliclyAvailablePage(page) || access.publicHostingAllowed) {
    return {
      page,
      access,
      changed: false,
    };
  }

  const { error } = await supabase
    .from("pages")
    .update({
      status: "draft",
      visibility: "private",
    })
    .eq("id", page.id);

  if (error) {
    throw error;
  }

  return {
    page: {
      ...page,
      status: "draft",
      visibility: "private",
    },
    access,
    changed: true,
  };
}
