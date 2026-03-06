import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/** POST /api/account/delete — permanently delete user account and all data */
export async function POST() {
  const authClient = createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleSupabaseClient();
  const userId = user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (profileError) {
    return NextResponse.json({ error: "Failed to load billing profile." }, { status: 500 });
  }

  const customerId = profile?.stripe_customer_id ?? null;
  if (customerId) {
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
      return NextResponse.json(
        {
          error:
            "Unable to cancel active billing. Please retry from Settings or contact support.",
        },
        { status: 409 },
      );
    }
  }

  // 1. Delete all user's pages
  await supabase
    .from("pages")
    .delete()
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`);

  // 2. Delete avatar files from storage
  const { data: avatarFiles } = await supabase.storage.from("avatars").list(userId);
  if (avatarFiles?.length) {
    await supabase.storage.from("avatars").remove(avatarFiles.map((f) => `${userId}/${f.name}`));
  }

  // 3. Delete profile
  await supabase.from("profiles").delete().eq("id", userId);

  // 4. Delete auth user
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
