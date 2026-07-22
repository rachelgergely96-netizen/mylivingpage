import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

export interface DeletionTargetProfile {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  stripe_customer_id: string | null;
}

export class AccountDeletionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AccountDeletionError";
    this.status = status;
  }
}

export function isAccountDeletionError(error: unknown): error is AccountDeletionError {
  return error instanceof AccountDeletionError;
}

export async function getDeletionTargetProfile(userId: string): Promise<DeletionTargetProfile | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username, full_name, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<DeletionTargetProfile>();

  if (error) {
    throw new AccountDeletionError("Failed to load billing profile.", 500);
  }

  return data ?? null;
}

async function cancelActiveSubscriptions(customerId: string) {
  const stripe = getStripe();

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    const cancellable = subscriptions.data.filter(
      (subscription) =>
        subscription.status !== "canceled" &&
        subscription.status !== "incomplete_expired",
    );

    for (const subscription of cancellable) {
      await stripe.subscriptions.cancel(subscription.id);
    }
    await stripe.customers.del(customerId);
  } catch (error) {
    console.error("Account deletion blocked: Stripe cancellation failed", error);
    throw new AccountDeletionError(
      "Unable to cancel active billing. Please retry or resolve billing first.",
      409,
    );
  }
}

async function removeUserFiles(bucket: string, userId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: files, error: listError } = await supabase.storage.from(bucket).list(userId);

  if (listError) {
    const statusCode = "statusCode" in listError ? String(listError.statusCode) : "";
    if (bucket === "page-images" && (statusCode === "404" || /bucket.*not found/i.test(listError.message))) {
      return;
    }
    throw new AccountDeletionError("Failed to inspect avatar files for deletion.", 500);
  }

  if (!files?.length) {
    return;
  }

  const { error: removeError } = await supabase.storage
    .from(bucket)
    .remove(files.map((file) => `${userId}/${file.name}`));

  if (removeError) {
    throw new AccountDeletionError("Failed to remove avatar files.", 500);
  }
}

interface DeleteUserAccountOptions {
  targetUserId: string;
  actorUserId?: string | null;
  auditEventName?: string | null;
}

export async function deleteUserAccount({
  targetUserId,
  actorUserId = null,
  auditEventName = null,
}: DeleteUserAccountOptions): Promise<DeletionTargetProfile | null> {
  const profile = await getDeletionTargetProfile(targetUserId);

  if (profile?.stripe_customer_id) {
    await cancelActiveSubscriptions(profile.stripe_customer_id);
  }

  await removeUserFiles("avatars", targetUserId);
  await removeUserFiles("page-images", targetUserId);

  const supabase = createServiceRoleSupabaseClient();
  const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);

  if (deleteError) {
    throw new AccountDeletionError("Failed to delete account.", 500);
  }

  if (auditEventName && actorUserId) {
    await trackEvent(actorUserId, auditEventName, {
      target_user_id: targetUserId,
    });
  }

  return profile;
}
