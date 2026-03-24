"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  getAccountAccessState,
  type AccountAccessState,
} from "@/lib/account-access";
import { HOSTING_PLAN_PRICE } from "@/lib/billing";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { normalizeUsernameSlug, validateUsernameSlug } from "@/lib/usernames";
import { getAccountTierLabel } from "@/lib/plans";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string;
  billing_cohort?: string | null;
  hosting_trial_started_at?: string | null;
  accountAccess?: AccountAccessState;
  latestPage?: {
    id: string;
    status: string | null;
    visibility: string | null;
    published_at: string | null;
  } | null;
  created_at: string;
  hasPassword: boolean;
}

function formatFriendlyDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDaysRemaining(value: string | null | undefined) {
  if (!value) return null;

  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;

  const days = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function isLivePublicPage(
  page:
    | {
        status: string | null;
        visibility: string | null;
      }
    | null
    | undefined,
) {
  return Boolean(
    page &&
      (page.visibility === "public" ||
        (page.visibility == null && page.status === "live")),
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvail, setUsernameAvail] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Save statuses
  const [savingName, setSavingName] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Feedback
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const legacyPlanLabel = profile ? getAccountTierLabel(profile.plan) : "basic access";

  // Load profile (with polling retry after upgrade to handle webhook race condition)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/profile");
      if (cancelled) return;
      if (res.status === 401) { router.push("/login?next=/dashboard/settings"); return; }
      if (!res.ok) { setLoading(false); return; }
      const data = (await res.json()) as Profile;

      const justUpgraded = searchParams.get("upgraded") === "true";
      const upgradedAccess = data.accountAccess ?? getAccountAccessState({
        plan: data.plan,
        billing_cohort: data.billing_cohort ?? null,
        hosting_trial_started_at: data.hosting_trial_started_at ?? null,
      });

      // If returning from Stripe checkout but webhook hasn't updated the plan yet,
      // poll up to 5 times (every 1.5s) until the paid hosting state is visible.
      if (justUpgraded && !upgradedAccess.hasPaidSubscription) {
        let retries = 0;
        const poll = async (): Promise<Profile> => {
          if (retries >= 5 || cancelled) return data;
          retries++;
          await new Promise((r) => setTimeout(r, 1500));
          if (cancelled) return data;
          const retry = await fetch("/api/profile");
          if (!retry.ok) return data;
          const fresh = (await retry.json()) as Profile;
          const freshAccess = fresh.accountAccess ?? getAccountAccessState({
            plan: fresh.plan,
            billing_cohort: fresh.billing_cohort ?? null,
            hosting_trial_started_at: fresh.hosting_trial_started_at ?? null,
          });
          if (freshAccess.hasPaidSubscription) return fresh;
          return poll();
        };
        const final = await poll();
        if (cancelled) return;
        setProfile(final);
        setFullName(final.full_name ?? "");
        setUsername(final.username ?? "");
        setAvatarUrl(final.avatar_url);
        setLoading(false);
        const finalAccess = final.accountAccess ?? getAccountAccessState({
          plan: final.plan,
          billing_cohort: final.billing_cohort ?? null,
          hosting_trial_started_at: final.hosting_trial_started_at ?? null,
        });
        showToast(
          finalAccess.hasPaidSubscription
            ? "Hosting subscription is active."
            : "Subscription processing - hosting will activate shortly.",
        );
        router.replace("/dashboard/settings", { scroll: false });
        return;
      }

      setProfile(data);
      setFullName(data.full_name ?? "");
      setUsername(data.username ?? "");
      setAvatarUrl(data.avatar_url);
      setLoading(false);
      if (justUpgraded) {
        showToast("Hosting subscription is active.");
        router.replace("/dashboard/settings", { scroll: false });
      }
    })();
    return () => { cancelled = true; };
  }, [router, searchParams, showToast]);

  // Username availability check (debounced)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!profile) return;
    const validation = validateUsernameSlug(username);
    if (validation.error) {
      setUsernameChecking(false);
      setUsernameAvail({ available: false, reason: validation.error });
      clearTimeout(checkTimeoutRef.current);
      return;
    }

    if (validation.slug === profile.username) {
      setUsernameChecking(false);
      setUsernameAvail(null);
      clearTimeout(checkTimeoutRef.current);
      return;
    }

    setUsernameChecking(true);
    clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username?slug=${encodeURIComponent(validation.slug)}`);
        const data = await res.json();
        setUsernameAvail({ available: data.available, reason: data.reason });
      } catch {
        setUsernameAvail({ available: false, reason: "Could not check username availability." });
      } finally {
        setUsernameChecking(false);
      }
    }, 400);

    return () => clearTimeout(checkTimeoutRef.current);
  }, [username, profile]);

  // Save full name
  const onSaveName = async () => {
    setSavingName(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });
    setSavingName(false);
    if (res.ok) {
      setProfile((p) => p ? { ...p, full_name: fullName } : p);
      showToast("Name updated");
    }
  };

  // Save username
  const onSaveUsername = async () => {
    const validation = validateUsernameSlug(username);
    if (validation.error) {
      showToast(validation.error);
      return;
    }
    const slug = validation.slug;
    if (!usernameAvail?.available) return;
    setSavingUsername(true);
    const res = await fetch("/api/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    setSavingUsername(false);
    if (res.ok) {
      setProfile((p) => p ? { ...p, username: slug } : p);
      setUsername(slug);
      setUsernameAvail(null);
      showToast("Username updated");
    }
  };

  // Avatar upload
  const onAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/avatar", { method: "POST", body: form });
    setUploadingAvatar(false);
    if (res.ok) {
      const { url } = await res.json();
      setAvatarUrl(url);
      showToast("Avatar updated");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onAvatarRemove = async () => {
    setUploadingAvatar(true);
    const res = await fetch("/api/avatar", { method: "DELETE" });
    setUploadingAvatar(false);
    if (res.ok) {
      setAvatarUrl(null);
      showToast("Avatar removed");
    }
  };

  // Change password
  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) { setPasswordMsg({ ok: false, text: "Password must be at least 8 characters." }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: "Passwords do not match." }); return; }

    setSavingPassword(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSavingPassword(false);
    if (res.ok) {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ ok: true, text: "Password updated successfully." });
    } else {
      const data = await res.json();
      setPasswordMsg({ ok: false, text: data.error ?? "Failed to update password." });
    }
  };

  // Delete account
  const onDeleteAccount = async () => {
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace("/");
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setDeleting(false);
      showToast(data?.error ?? "Failed to delete account.");
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 md:px-10">
        <p className="text-sm text-[rgba(240,244,255,0.5)]">Loading settings...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 md:px-10">
        <p className="text-sm text-[#ff8e8e]">Unable to load profile.</p>
      </main>
    );
  }

  const usernameChanged = normalizeUsernameSlug(username) !== profile.username;
  const accountAccess =
    profile.accountAccess ??
    getAccountAccessState({
      plan: profile.plan,
      billing_cohort: profile.billing_cohort ?? null,
      hosting_trial_started_at: profile.hosting_trial_started_at ?? null,
    });
  const trialEndsAtLabel = formatFriendlyDate(accountAccess.trialEndsAt);
  const trialDaysRemaining = formatDaysRemaining(accountAccess.trialEndsAt);
  const livePageActive = isLivePublicPage(profile.latestPage);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-10 md:px-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-[rgba(59,130,246,0.3)] bg-[rgba(10,22,40,0.9)] px-5 py-3 text-sm text-[#93C5FD] backdrop-blur-xl">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Settings</p>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[#F0F4FF]">Account Settings</h1>
      </div>

      {/* ── Profile Section ── */}
      <section className="glass-card rounded-2xl p-5 sm:p-7 mb-5">
        <h2 className="font-heading text-lg font-semibold text-[#F0F4FF] mb-5">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl text-[rgba(240,244,255,0.3)]">
                {(profile.full_name?.[0] ?? profile.username?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="rounded-full border border-[rgba(59,130,246,0.35)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] disabled:opacity-50"
            >
              {uploadingAvatar ? "Uploading..." : "Upload"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={onAvatarRemove}
                disabled={uploadingAvatar}
                className="rounded-full border border-[rgba(255,255,255,0.12)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.5)] hover:text-[#ff8e8e] disabled:opacity-50"
              >
                Remove
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatarUpload} />
          </div>
        </div>

        {/* Full Name */}
        <div className="mb-5">
          <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Full Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="h-11 flex-1 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="button"
              onClick={onSaveName}
              disabled={savingName || fullName === (profile.full_name ?? "")}
              className="rounded-xl border border-[rgba(59,130,246,0.35)] px-5 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] disabled:opacity-40"
            >
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Username */}
        <div className="mb-5">
          <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Username</label>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-0 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] focus-within:border-[#3B82F6]">
              <span className="pl-4 text-sm text-[rgba(240,244,255,0.3)]">mylivingpage.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={40}
                className="h-11 flex-1 bg-transparent px-1 text-sm text-[#F0F4FF] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onSaveUsername}
              disabled={savingUsername || !usernameChanged || !usernameAvail?.available}
              className="rounded-xl border border-[rgba(59,130,246,0.35)] px-5 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] disabled:opacity-40"
            >
              {savingUsername ? "Saving..." : "Save"}
            </button>
          </div>
          {usernameChecking && <p className="mt-1.5 text-xs text-[rgba(240,244,255,0.4)]">Checking...</p>}
          {usernameAvail && !usernameChecking && (
            <p className={`mt-1.5 text-xs ${usernameAvail.available ? "text-[#4ade80]" : "text-[#ff8e8e]"}`}>
              {usernameAvail.available ? "Available" : usernameAvail.reason}
            </p>
          )}
          <p className="mt-1.5 text-[10px] text-[rgba(240,244,255,0.32)]">
            This is your public page URL. Use 3-40 letters, numbers, hyphens, underscores, or periods.
          </p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Email</label>
          <input
            type="email"
            value={profile.email ?? ""}
            disabled
            className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 text-sm text-[rgba(240,244,255,0.4)]"
          />
          <p className="mt-1 text-[10px] text-[rgba(240,244,255,0.3)]">Email changes are not yet supported.</p>
        </div>
      </section>

      {/* ── Account Section (Password) ── */}
      {profile.hasPassword && (
        <section className="glass-card rounded-2xl p-5 sm:p-7 mb-5">
          <h2 className="font-heading text-lg font-semibold text-[#F0F4FF] mb-5">Change Password</h2>
          <form className="space-y-3 max-w-sm" onSubmit={onChangePassword}>
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Repeat password"
                className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.35)] focus:border-[#3B82F6] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-xl border border-[rgba(59,130,246,0.35)] px-6 py-2.5 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:text-[#93C5FD] disabled:opacity-50"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
            {passwordMsg && (
              <p className={`text-xs ${passwordMsg.ok ? "text-[#4ade80]" : "text-[#ff8e8e]"}`}>{passwordMsg.text}</p>
            )}
          </form>
        </section>
      )}

      {/* ── Plan Section ── */}
      <section className="glass-card rounded-2xl p-5 sm:p-7 mb-5">
        <h2 className="font-heading text-lg font-semibold text-[#F0F4FF] mb-3">
          {accountAccess.isLegacyAccount ? "Plan" : "Hosting"}
        </h2>
        {!accountAccess.isLegacyAccount ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.14em] ${accountAccess.hasPaidSubscription ? "border-[rgba(74,222,128,0.35)] text-[#4ade80]" : accountAccess.requiresSubscription ? "border-[rgba(245,158,11,0.35)] text-[#FCD34D]" : "border-[rgba(59,130,246,0.35)] text-[#3B82F6]"}`}>
                {accountAccess.hasPaidSubscription
                  ? "subscription active"
                  : accountAccess.requiresSubscription
                    ? "hosting inactive"
                    : accountAccess.isActiveFreeMonth
                      ? "free month active"
                      : "free month ready"}
              </span>
              {accountAccess.hasPaidSubscription ? (
                <>
                  <span className="text-xs text-[rgba(240,244,255,0.5)]">{HOSTING_PLAN_PRICE.displayLabel}</span>
                  <button
                    type="button"
                    disabled={billingLoading}
                    onClick={async () => {
                      setBillingLoading(true);
                      const res = await fetch("/api/stripe/portal", { method: "POST" });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                      else setBillingLoading(false);
                    }}
                    className="rounded-full border border-[rgba(255,255,255,0.12)] px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:text-[#F0F4FF] disabled:opacity-50"
                  >
                    {billingLoading ? "Loading..." : "Manage Subscription"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={billingLoading}
                  onClick={async () => {
                    setBillingLoading(true);
                    const res = await fetch("/api/stripe/checkout", { method: "POST" });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                    else setBillingLoading(false);
                  }}
                  className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-300 hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)] disabled:opacity-50"
                >
                  {billingLoading ? "Loading..." : `Continue Hosting - ${HOSTING_PLAN_PRICE.amountLabel}/mo`}
                </button>
              )}
            </div>
            {!accountAccess.hasStartedFreeMonth ? (
              <p className="mt-3 text-sm text-[rgba(240,244,255,0.58)]">
                Your free month starts the first time your page goes live. All features are already unlocked while you build, and no card is required to publish.
              </p>
            ) : null}
            {accountAccess.isActiveFreeMonth && trialEndsAtLabel ? (
              <p className="mt-3 text-sm text-[rgba(240,244,255,0.58)]">
                Your free hosting month is active until <span className="text-[#F0F4FF]">{trialEndsAtLabel}</span>{trialDaysRemaining ? ` (${trialDaysRemaining})` : ""}. Your page stays live during the trial, and you can switch to monthly hosting anytime.
              </p>
            ) : null}
            {accountAccess.requiresSubscription ? (
              <p className="mt-3 text-sm text-[rgba(240,244,255,0.58)]">
                Your free hosting month ended{trialEndsAtLabel ? ` on ${trialEndsAtLabel}` : ""}, so your public page is now offline. Continue hosting to bring the page back live.
              </p>
            ) : null}
            {accountAccess.hasPaidSubscription ? (
              <p className="mt-3 text-sm text-[rgba(240,244,255,0.58)]">
                Monthly hosting is active. Your page can stay live while the subscription remains active.
              </p>
            ) : null}
            <div className="mt-4 rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-4 py-3 text-sm text-[rgba(240,244,255,0.72)]">
              {livePageActive
                ? "Your public page is currently live."
                : accountAccess.requiresSubscription
                  ? "Your public page is currently offline until hosting resumes."
                  : "Your page is not live yet. Publish it when you are ready to start the free hosting month."}
            </div>
          </>
        ) : null}
        {accountAccess.isLegacyAccount ? (
          <>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.14em] ${accountAccess.hasPaidSubscription ? "border-[rgba(74,222,128,0.35)] text-[#4ade80]" : "border-[rgba(59,130,246,0.35)] text-[#3B82F6]"}`}>
            {legacyPlanLabel}
          </span>
          {accountAccess.hasPaidSubscription ? (
            <>
              <span className="text-xs text-[rgba(240,244,255,0.5)]">{HOSTING_PLAN_PRICE.displayLabel}</span>
              <button
                type="button"
                disabled={billingLoading}
                onClick={async () => {
                  setBillingLoading(true);
                  const res = await fetch("/api/stripe/portal", { method: "POST" });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else setBillingLoading(false);
                }}
                className="rounded-full border border-[rgba(255,255,255,0.12)] px-4 py-1.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:text-[#F0F4FF] disabled:opacity-50"
              >
                {billingLoading ? "Loading..." : "Manage Subscription"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={billingLoading}
              onClick={async () => {
                setBillingLoading(true);
                const res = await fetch("/api/stripe/checkout", { method: "POST" });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else setBillingLoading(false);
              }}
              className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-300 hover:shadow-[0_8px_28px_rgba(59,130,246,0.3)] disabled:opacity-50"
            >
              {billingLoading ? "Loading..." : `Start Hosting - ${HOSTING_PLAN_PRICE.amountLabel}/mo`}
            </button>
          )}
        </div>
        {!accountAccess.hasPaidSubscription && (
          <p className="mt-3 text-xs text-[rgba(240,244,255,0.4)]">
            Unlock additional themes, PNG share cards, and remove the badge. Page Analytics are already included.
          </p>
        )}
        <p className="mt-3 text-[11px] leading-5 text-[rgba(240,244,255,0.44)]">
          Monthly hosting auto-renews until canceled. By subscribing, you agree to our{" "}
          <Link href="/terms" className="text-[#93C5FD] hover:text-[#BFDBFE] underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#93C5FD] hover:text-[#BFDBFE] underline underline-offset-2">
            Privacy Policy
          </Link>
          . Cancel anytime from the billing portal. No refunds except where required by law.
        </p>
          </>
        ) : null}
      </section>

      {/* ── Danger Zone ── */}
      <section className="rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.04)] p-5 sm:p-7">
        <h2 className="font-heading text-lg font-semibold text-[#ff8e8e] mb-3">Danger Zone</h2>
        <p className="mb-4 text-sm text-[rgba(240,244,255,0.5)]">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="rounded-xl border border-[rgba(239,68,68,0.4)] px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-[#ff8e8e] hover:bg-[rgba(239,68,68,0.1)]"
        >
          Delete Account
        </button>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(239,68,68,0.25)] bg-[rgba(10,22,40,0.95)] p-6 sm:p-7">
            <h3 className="font-heading text-xl font-bold text-[#ff8e8e] mb-3">Delete Account</h3>
            <p className="mb-4 text-sm text-[rgba(240,244,255,0.6)]">
              This will permanently delete your profile, all pages, and page activity data. If you have an active paid subscription, it will be canceled before deletion and no refund is issued except where required by law. Type <span className="font-mono text-[#ff8e8e]">{profile.username}</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={profile.username}
              className="mb-4 h-11 w-full rounded-xl border border-[rgba(239,68,68,0.25)] bg-[rgba(255,255,255,0.03)] px-4 text-sm text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.25)] focus:border-[#ef4444] focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                className="flex-1 rounded-xl border border-[rgba(255,255,255,0.12)] py-2.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:text-[#F0F4FF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={deleteConfirmText !== profile.username || deleting}
                className="flex-1 rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.15)] py-2.5 text-xs uppercase tracking-[0.14em] text-[#ff8e8e] hover:bg-[rgba(239,68,68,0.25)] disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
