import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAccountAccessState,
  type AccountAccessInput,
  type AccountAccessState,
} from "@/lib/account-access";
import { isPubliclyReachablePage } from "@/lib/page-visibility";

interface HostingManagedPage {
  id: string;
  owner_id?: string | null;
  user_id?: string | null;
  status?: string | null;
  visibility?: string | null;
}

/**
 * Reachable at its public URL. "Link only" counts: it is live and openable,
 * it is simply not offered to search engines. See `page-visibility.ts` for the
 * indexability question, which is now separate.
 */
export function isPubliclyAvailablePage(
  page:
    | Pick<HostingManagedPage, "status" | "visibility">
    | null
    | undefined,
) {
  return isPubliclyReachablePage(page);
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
