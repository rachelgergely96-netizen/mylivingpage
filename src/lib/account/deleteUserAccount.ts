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
  } catch (error) {
    console.error("Account deletion blocked: Stripe cancellation failed", error);
    throw new AccountDeletionError(
      "Unable to cancel active billing. Please retry or resolve billing first.",
      409,
    );
  }
}

async function removeAvatarFiles(userId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: avatarFiles, error: listError } = await supabase.storage.from("avatars").list(userId);

  if (listError) {
    throw new AccountDeletionError("Failed to inspect avatar files for deletion.", 500);
  }

  if (!avatarFiles?.length) {
    return;
  }

  const { error: removeError } = await supabase.storage
    .from("avatars")
    .remove(avatarFiles.map((file) => `${userId}/${file.name}`));

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

  await removeAvatarFiles(targetUserId);

  const supabase = createServiceRoleSupabaseClient();
  const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);

  if (deleteError) {
    throw new AccountDeletionError("Failed to delete account.", 500);
  }

  if (auditEventName && actorUserId) {
    await trackEvent(actorUserId, auditEventName, {
      target_user_id: targetUserId,
      target_email: profile?.email ?? null,
      target_username: profile?.username ?? null,
    });
  }

  return profile;
}
