"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  getAccountAccessState,
  type AccountAccessState,
} from "@/lib/account-access";
import PageVisibilityControl from "@/components/dashboard/PageVisibilityControl";
import MotionModeControl from "@/components/motion/MotionModeControl";
import ModeAwareLoadingIndicator from "@/components/motion/ModeAwareLoadingIndicator";
import { clearBrowserLocalDraftStorage } from "@/hooks/useLocalDraft";
import { finishDeletedAccountClientState } from "@/lib/account-deletion-client";
import UsernameAvailabilityFeedback, {
  readUsernameAvailabilityResponse,
  type UsernameAvailabilityResult,
} from "./UsernameAvailabilityFeedback";
import PasswordChangeFeedback, {
  getPasswordFieldErrorProps,
  readPasswordChangeResponse,
  type PasswordChangeMessage,
} from "./PasswordChangeFeedback";
import DeleteAccountError, {
  DELETE_ACCOUNT_ERROR_ID,
  focusDeleteFailureControl,
} from "./DeleteAccountError";
import {
  getPageVisibilityState,
  isPubliclyReachablePage,
} from "@/lib/page-visibility";
import { PRO_PLAN_PRICE, STARTER_PLAN_PRICE } from "@/lib/billing";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { normalizeUsernameSlug, validateUsernameSlug } from "@/lib/usernames";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string;
  billing_cohort?: string | null;
  hosting_trial_started_at?: string | null;
  stripe_subscription_status?: string | null;
  stripe_trial_ends_at?: string | null;
  accountAccess?: AccountAccessState;
  latestPage?: {
    id: string;
    status: string | null;
    visibility: string | null;
    search_indexable: boolean | null;
    published_at: string | null;
  } | null;
  created_at: string;
  hasPassword: boolean;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Live means reachable at its URL. "Link only" is live; it is simply withheld
// from search engines. See lib/page-visibility.ts.
const isLivePublicPage = isPubliclyReachablePage;

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const usernameSaveButtonRef = useRef<HTMLButtonElement>(null);
  const usernameManualRetryRef = useRef(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteRetryRef = useRef<HTMLButtonElement>(null);
  const deletingRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const [billingAction, setBillingAction] = useState<"portal" | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvail, setUsernameAvail] = useState<
    (UsernameAvailabilityResult & { slug: string }) | null
  >(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameCheckAttempt, setUsernameCheckAttempt] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Save statuses
  const [savingName, setSavingName] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<PasswordChangeMessage | null>(null);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteCurrentPassword, setDeleteCurrentPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Feedback
  const [toast, setToast] = useState<{ text: string; variant: "status" | "danger" } | null>(null);

  const showToast = useCallback((msg: string, variant: "status" | "danger" = "status") => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ text: msg, variant });
    // Errors stay until dismissed or replaced; successes clear on their own.
    if (variant === "status") {
      toastTimerRef.current = window.setTimeout(() => {
        toastTimerRef.current = null;
        setToast(null);
      }, 3000);
    }
  }, []);

  const billingLoading = billingAction !== null;

  // Load profile (with polling retry after upgrade to handle webhook race condition)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
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
        stripe_subscription_status: data.stripe_subscription_status ?? null,
        stripe_trial_ends_at: data.stripe_trial_ends_at ?? null,
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
            stripe_subscription_status: fresh.stripe_subscription_status ?? null,
            stripe_trial_ends_at: fresh.stripe_trial_ends_at ?? null,
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
          stripe_subscription_status: final.stripe_subscription_status ?? null,
          stripe_trial_ends_at: final.stripe_trial_ends_at ?? null,
        });
        showToast(
          finalAccess.hasPaidSubscription
            ? `${finalAccess.publicPlanLabel} trial is active.`
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
        showToast(`${upgradedAccess.publicPlanLabel} trial is active.`);
        router.replace("/dashboard/settings", { scroll: false });
      }
    })().catch(() => {
      if (!cancelled) {
        setProfileLoadError("We could not load your settings. Check your connection and try again.");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [router, searchParams, showToast]);

  // Username availability check (debounced)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!profile) return;
    const validation = validateUsernameSlug(username);
    if (validation.error) {
      setUsernameChecking(false);
      setUsernameAvail({ status: "unavailable", reason: validation.error, slug: validation.slug });
      clearTimeout(checkTimeoutRef.current);
      return;
    }

    if (validation.slug === profile.username) {
      setUsernameChecking(false);
      setUsernameAvail(null);
      clearTimeout(checkTimeoutRef.current);
      return;
    }

    const requestedSlug = validation.slug;
    const isManualRetry = usernameManualRetryRef.current;
    usernameManualRetryRef.current = false;
    const controller = new AbortController();
    setUsernameChecking(true);
    clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username?slug=${encodeURIComponent(validation.slug)}`, {
          signal: controller.signal,
        });
        const result = await readUsernameAvailabilityResponse(res);
        if (controller.signal.aborted) return;
        setUsernameAvail({ ...result, slug: requestedSlug });
        if (isManualRetry && result.status !== "error") {
          window.requestAnimationFrame(() => {
            if (result.status === "available") {
              usernameSaveButtonRef.current?.focus();
            } else {
              usernameInputRef.current?.focus();
            }
          });
        }
      } catch {
        if (controller.signal.aborted) return;
        setUsernameAvail({
          status: "error",
          reason: "Could not check username availability. Try again.",
          slug: requestedSlug,
        });
      } finally {
        if (!controller.signal.aborted) {
          setUsernameChecking(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(checkTimeoutRef.current);
      controller.abort();
    };
  }, [username, profile, usernameCheckAttempt]);

  useEffect(() => {
    if (!showDeleteModal) {
      return;
    }

    const trigger = deleteTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingRef.current) {
        setShowDeleteModal(false);
        setDeleteConfirmText("");
        setDeleteCurrentPassword("");
        setDeleteError(null);
        return;
      }

      if (event.key !== "Tab" || !deleteDialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        deleteDialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusableElements.length) {
        event.preventDefault();
        deleteDialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    deleteInputRef.current?.focus();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [showDeleteModal]);

  useEffect(() => {
    if (!showDeleteModal || deleting || !deleteError) {
      return;
    }

    focusDeleteFailureControl(deleteRetryRef.current, deleteInputRef.current);
  }, [deleteError, deleting, showDeleteModal]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Save full name
  const onSaveName = async () => {
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not update your name.");
      }
      setProfile((current) => current ? { ...current, full_name: fullName } : current);
      showToast("Name updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update your name.", "danger");
    } finally {
      setSavingName(false);
    }
  };

  // Save username
  const onSaveUsername = async () => {
    const validation = validateUsernameSlug(username);
    if (validation.error) {
      showToast(validation.error, "danger");
      return;
    }
    const slug = validation.slug;
    if (usernameAvail?.status !== "available" || usernameAvail.slug !== validation.slug) return;
    setSavingUsername(true);
    try {
      const res = await fetch("/api/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not update your username.");
      }
      setProfile((current) => current ? { ...current, username: slug } : current);
      setUsername(slug);
      setUsernameAvail(null);
      showToast("Username updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update your username.", "danger");
    } finally {
      setSavingUsername(false);
    }
  };

  // Avatar upload
  const onAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Could not upload your avatar.");
      }
      const { url } = data;
      setAvatarUrl(url);
      showToast("Avatar updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not upload your avatar.", "danger");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onAvatarRemove = async () => {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not remove your avatar.");
      }
      setAvatarUrl(null);
      showToast("Avatar removed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not remove your avatar.", "danger");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Change password
  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) { setPasswordMsg({ ok: false, text: "Password must be at least 8 characters.", field: "new" }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: "Passwords do not match.", field: "confirm" }); return; }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword, currentPassword }),
      });
      const result = await readPasswordChangeResponse(res);
      if (!result.ok) {
        setPasswordMsg(result);
        return;
      }
      setNewPassword("");
      setCurrentPassword("");
      setConfirmPassword("");
      setPasswordMsg(result);
    } catch {
      setPasswordMsg({
        ok: false,
        text: "Failed to update password. Check your connection and try again.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Delete account
  const onDeleteAccount = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: deleteCurrentPassword }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete account.");
      }
      const supabase = createBrowserSupabaseClient();
      await finishDeletedAccountClientState({
        clearLocalDrafts: clearBrowserLocalDraftStorage,
        signOut: () => supabase.auth.signOut(),
        navigateHome: () => router.replace("/"),
      });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete account.");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="site-container max-w-3xl py-8 sm:py-12" id="main-content">
        <div className="mb-8">
          <p className="site-eyebrow">Settings</p>
          <h1 className="site-page-title mt-2">Account settings</h1>
        </div>
        <div className="site-panel flex items-center gap-4 p-5 sm:p-7" role="status" aria-live="polite">
          <ModeAwareLoadingIndicator size="lg" />
          <div>
            <p className="font-semibold text-site-text">Loading settings</p>
            <p className="mt-1 text-sm text-site-muted">Preparing your account controls…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="site-container py-10" id="main-content">
        <p className="text-sm text-site-danger" role="alert">
          {profileLoadError ?? "Unable to load profile."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="site-button site-button-secondary mt-4"
        >
          Try again
        </button>
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
      stripe_subscription_status: profile.stripe_subscription_status ?? null,
      stripe_trial_ends_at: profile.stripe_trial_ends_at ?? null,
    });
  const livePageActive = isLivePublicPage(profile.latestPage);
  const activePlanPrice =
    profile.plan === "starter" ? STARTER_PLAN_PRICE : PRO_PLAN_PRICE;

  const openBillingPortal = async () => {
    setBillingAction("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      showToast(data?.error ?? "Could not open billing portal.", "danger");
    } catch {
      showToast("Could not open billing portal.", "danger");
    } finally {
      setBillingAction(null);
    }
  };

  return (
    <main className="site-container max-w-3xl py-8 sm:py-12" id="main-content">
      {/* Toast: sits below the 64px sticky header; errors persist until dismissed. */}
      {toast && (
        <div
          className={`site-panel-raised fixed left-4 right-4 top-20 z-50 flex items-start gap-2 px-4 py-3 text-sm sm:left-auto sm:max-w-[375px] ${
            toast.variant === "danger" ? "text-site-danger" : "text-site-text"
          }`}
          style={
            toast.variant === "danger"
              ? { borderLeftColor: "var(--site-danger)", borderLeftWidth: 2 }
              : undefined
          }
          role={toast.variant === "danger" ? "alert" : "status"}
        >
          {toast.variant === "danger" ? (
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.75v3.75" strokeLinecap="square" />
              <path d="M8 11.25h.01" strokeLinecap="round" />
            </svg>
          ) : null}
          <span className="min-w-0 flex-1">{toast.text}</span>
          {toast.variant === "danger" ? (
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss message"
              className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-site-secondary transition-colors hover:text-site-text"
            >
              <span aria-hidden="true" className="text-base leading-none">×</span>
            </button>
          ) : null}
        </div>
      )}

      <div className="mb-8">
        <p className="site-eyebrow">Settings</p>
        <h1 className="site-page-title mt-2">Account settings</h1>
      </div>

      {/* ── Profile Section ── */}
      <section className="site-panel mb-5 p-5 sm:p-7">
        <h2 className="site-panel-title mb-5">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-none border border-site-border bg-site-canvas-alt">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl text-site-muted">
                {(profile.full_name?.[0] ?? profile.username?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="site-button site-button-secondary min-w-[7.5rem] px-4 py-2 disabled:opacity-50"
            >
              {uploadingAvatar ? "Uploading…" : "Upload"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={onAvatarRemove}
                disabled={uploadingAvatar}
                className="site-button site-button-secondary px-4 py-2 disabled:opacity-50"
              >
                Remove
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatarUpload} />
          </div>
        </div>

        {/* Full Name */}
        <div className="mb-5">
          <label htmlFor="settings-full-name" className="mb-1.5 block text-sm font-semibold text-site-secondary">Full name</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="settings-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="site-field h-12 min-w-0 flex-1 px-4 text-base sm:text-sm"
            />
            <button
              type="button"
              onClick={onSaveName}
              disabled={savingName || fullName === (profile.full_name ?? "")}
              className="site-button site-button-primary min-w-[6rem] px-5 disabled:opacity-40"
            >
              {savingName ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* Username */}
        <div className="mb-5">
          <label htmlFor="settings-username" className="mb-1.5 block text-sm font-semibold text-site-secondary">Username</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-h-12 min-w-0 flex-1 items-center gap-0 rounded-none border border-site-border-strong bg-site-canvas-alt focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-site-focus">
              <span className="pl-4 text-base text-site-muted sm:text-sm">mylivingpage.com/</span>
              <input
                ref={usernameInputRef}
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameAvail(null);
                }}
                maxLength={40}
                aria-invalid={usernameAvail?.status === "unavailable" ? true : undefined}
                aria-describedby={`settings-username-help${usernameChecking || usernameAvail ? " settings-username-feedback" : ""}`}
                className="h-12 min-w-0 flex-1 bg-transparent px-1 text-base text-site-text focus:outline-none sm:text-sm"
              />
            </div>
            <button
              ref={usernameSaveButtonRef}
              type="button"
              onClick={onSaveUsername}
              disabled={savingUsername || usernameChecking || !usernameChanged || usernameAvail?.status !== "available" || usernameAvail.slug !== normalizeUsernameSlug(username)}
              className="site-button site-button-primary min-w-[6rem] px-5 disabled:opacity-40"
            >
              {savingUsername ? "Saving…" : "Save"}
            </button>
          </div>
          <UsernameAvailabilityFeedback
            checking={usernameChecking}
            result={usernameAvail}
            onRetry={() => {
              if (usernameChecking) return;
              usernameManualRetryRef.current = true;
              setUsernameCheckAttempt((attempt) => attempt + 1);
            }}
          />
          <p id="settings-username-help" className="mt-1.5 text-xs text-site-muted">
            This is your public page URL. Use 3-40 letters, numbers, hyphens, underscores, or periods.
          </p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label htmlFor="settings-email" className="mb-1.5 block text-sm font-semibold text-site-secondary">Email</label>
          <input
            id="settings-email"
            type="email"
            value={profile.email ?? ""}
            disabled
            className="site-field h-12 w-full px-4 text-base text-site-muted disabled:opacity-80 sm:text-sm"
          />
          <p className="mt-1 text-xs text-site-muted">Email changes are not yet supported.</p>
        </div>
      </section>

      <MotionModeControl className="mb-5" />

      {/* ── Account Section (Password) ── */}
      {profile.hasPassword && (
        <section className="site-panel mb-5 p-5 sm:p-7">
          <h2 className="site-panel-title mb-5">Change password</h2>
          <form
            className="space-y-3 max-w-sm"
            onSubmit={onChangePassword}
            aria-describedby={passwordMsg && !passwordMsg.ok && !passwordMsg.field ? "password-form-error" : undefined}
          >
            <div>
              <label htmlFor="settings-current-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">Current password</label>
              <input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                {...getPasswordFieldErrorProps(passwordMsg, "current")}
                className="site-field h-12 w-full px-4 text-base sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-new-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">New password</label>
              <input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                {...getPasswordFieldErrorProps(passwordMsg, "new")}
                className="site-field h-12 w-full px-4 text-base sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">Confirm password</label>
              <input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Repeat password"
                {...getPasswordFieldErrorProps(passwordMsg, "confirm")}
                className="site-field h-12 w-full px-4 text-base sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="site-button site-button-primary min-w-[10.5rem] disabled:opacity-50"
            >
              {savingPassword ? "Updating…" : "Update password"}
            </button>
            {passwordMsg ? <PasswordChangeFeedback message={passwordMsg} /> : null}
          </form>
        </section>
      )}

      {profile.latestPage ? (
        <PageVisibilityControl
          pageId={profile.latestPage.id}
          slug={profile.username}
          initialState={getPageVisibilityState(profile.latestPage)}
        />
      ) : null}

      {/* Universal free access with transitional subscription management. */}
      <section className="site-panel mb-5 p-5 sm:p-7">
        <h2 className="site-panel-title mb-3">
          Access
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="site-badge site-badge-success">
            Free access
          </span>
          <span className="text-xs text-site-muted">
            No card or subscription required
          </span>
        </div>
        <p className="site-muted mt-3 text-sm leading-6">
          Your living résumé, public link, ATS-ready PDF, share card, themes, and page
          analytics are available free.
        </p>
        <div className="site-callout mt-4 px-4 py-3 text-sm">
          {livePageActive
            ? getPageVisibilityState(profile.latestPage) === "link"
              ? "Your page is live and hidden from search."
              : "Your public page is currently live."
            : "Your page is not live yet. Publish it whenever you are ready."}
        </div>
        {accountAccess.hasPaidSubscription ? (
          <div className="site-callout site-callout-warning mt-5 p-4">
            <p className="text-sm font-medium text-site-warning">
              Existing {accountAccess.publicPlanLabel} subscription detected
            </p>
            <p className="site-muted mt-2 text-sm leading-6">
              Publishing is now free, so this subscription is no longer required for your
              page to stay live. It may continue at {activePlanPrice.displayLabel} until you
              cancel it in the billing portal.
            </p>
            <button
              type="button"
              disabled={billingLoading}
              onClick={() => void openBillingPortal()}
              className="site-button site-button-secondary mt-3 min-w-[12rem] px-4 py-2 disabled:opacity-50"
            >
              {billingAction === "portal" ? "Opening portal…" : "Manage subscription"}
            </button>
          </div>
        ) : null}
      </section>

      {/* ── Danger Zone ── */}
      <section className="site-danger-panel p-5 sm:p-7">
        <h2 className="site-panel-title mb-3 text-site-danger">Danger zone</h2>
        <p className="mb-4 text-sm text-site-secondary">
          Permanently delete your account and all associated data. This action cannot be undone.{" "}
          <Link
            href="/delete-account"
            className="font-semibold text-site-action underline underline-offset-4 transition-colors hover:text-site-action-hover"
          >
            What gets deleted
          </Link>
        </p>
        <button
          ref={deleteTriggerRef}
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="site-button site-button-danger"
        >
          Delete account
        </button>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div ref={deleteDialogRef} tabIndex={-1} className="site-panel-raised w-full max-w-md border-site-danger p-6 sm:p-7" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description">
            <h3 id="delete-account-title" className="mb-3 font-site text-xl font-semibold text-site-danger">Delete account</h3>
            <p id="delete-account-description" className="mb-4 text-sm text-site-secondary">
              This will permanently delete your profile, all pages, and page activity data. If you have an active paid subscription, it will be canceled before deletion and no refund is issued except where required by law. Type <span className="font-mono text-site-danger">{profile.username}</span> to confirm.
            </p>
            <input
              ref={deleteInputRef}
              aria-label={`Type ${profile.username} to confirm account deletion`}
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError(null);
              }}
              placeholder={profile.username}
              className="site-field mb-4 h-12 w-full px-4 text-base sm:text-sm"
            />
            {profile.hasPassword ? (
              <input
                aria-label="Current password"
                type="password"
                autoComplete="current-password"
                value={deleteCurrentPassword}
                onChange={(e) => {
                  setDeleteCurrentPassword(e.target.value);
                  setDeleteError(null);
                }}
                placeholder="Current password"
                aria-invalid={deleteError ? true : undefined}
                aria-describedby={deleteError ? DELETE_ACCOUNT_ERROR_ID : undefined}
                className="site-field mb-4 h-12 w-full px-4 text-base sm:text-sm"
              />
            ) : (
              <p className="mb-4 text-xs text-site-muted">
                You signed in with Google. To confirm it is you, your last sign-in must be
                within the past 10 minutes. If it has been longer, sign out, sign back in,
                then delete your account.
              </p>
            )}
            {deleteError ? <DeleteAccountError message={deleteError} /> : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                    setDeleteCurrentPassword("");
                    setDeleteError(null);
                  }
                }}
                disabled={deleting}
                className="site-button site-button-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                ref={deleteRetryRef}
                type="button"
                onClick={onDeleteAccount}
                disabled={deleteConfirmText !== profile.username || (profile.hasPassword && !deleteCurrentPassword) || deleting}
                aria-describedby={deleteError ? DELETE_ACCOUNT_ERROR_ID : undefined}
                className="site-button site-button-danger flex-1 disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
