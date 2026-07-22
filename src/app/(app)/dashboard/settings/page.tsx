"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  getAccountAccessState,
  type AccountAccessState,
} from "@/lib/account-access";
import { clearBrowserLocalDraftStorage } from "@/hooks/useLocalDraft";
import { PRO_PLAN_PRICE, STARTER_PLAN_PRICE } from "@/lib/billing";
import { isPubliclyAvailablePage } from "@/lib/hosting-state";
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
    published_at: string | null;
  } | null;
  created_at: string;
  hasPassword: boolean;
}

interface UsernameAvailability {
  available: boolean;
  reason: string | null;
  slug: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deletingRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const [billingAction, setBillingAction] = useState<"portal" | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvail, setUsernameAvail] = useState<UsernameAvailability | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
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
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteCurrentPassword, setDeleteCurrentPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Feedback
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(msg);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast(null);
    }, 3000);
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

      setProfile(data);
      setFullName(data.full_name ?? "");
      setUsername(data.username ?? "");
      setAvatarUrl(data.avatar_url);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setProfileLoadError("We could not load your settings. Check your connection and try again.");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  // Username availability check (debounced)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!profile) return;
    const validation = validateUsernameSlug(username);
    if (validation.error) {
      setUsernameChecking(false);
      setUsernameAvail({ available: false, reason: validation.error, slug: validation.slug });
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
    const controller = new AbortController();
    setUsernameAvail(null);
    setUsernameChecking(true);
    clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username?slug=${encodeURIComponent(validation.slug)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        setUsernameAvail({ available: data.available, reason: data.reason, slug: requestedSlug });
      } catch {
        if (controller.signal.aborted) return;
        setUsernameAvail({ available: false, reason: "Could not check username availability.", slug: requestedSlug });
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
  }, [username, profile]);

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
      showToast(error instanceof Error ? error.message : "Could not update your name.");
    } finally {
      setSavingName(false);
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
    if (!usernameAvail?.available || usernameAvail.slug !== validation.slug) return;
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
      showToast(error instanceof Error ? error.message : "Could not update your username.");
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
      showToast(error instanceof Error ? error.message : "Could not upload your avatar.");
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
      showToast(error instanceof Error ? error.message : "Could not remove your avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Change password
  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) { setPasswordMsg({ ok: false, text: "Password must be at least 8 characters." }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: "Passwords do not match." }); return; }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword, currentPassword }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update password.");
      }
      setNewPassword("");
      setCurrentPassword("");
      setConfirmPassword("");
      setPasswordMsg({ ok: true, text: "Password updated successfully." });
    } catch (error) {
      setPasswordMsg({
        ok: false,
        text: error instanceof Error ? error.message : "Failed to update password.",
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
      clearBrowserLocalDraftStorage();
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete account.");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="site-container py-10" id="main-content">
        <p className="site-muted text-sm" role="status">Loading settings...</p>
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
  const livePageActive = isPubliclyAvailablePage(profile.latestPage);
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

      showToast(data?.error ?? "Could not open billing portal.");
    } catch {
      showToast("Could not open billing portal.");
    } finally {
      setBillingAction(null);
    }
  };

  return (
    <main className="site-container max-w-3xl py-8 sm:py-12" id="main-content">
      {/* Toast */}
      {toast && (
        <div className="site-panel-raised fixed right-4 top-4 z-50 px-5 py-3 text-sm text-site-action" role="status">
          {toast}
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
              className="site-button site-button-secondary px-4 py-2 text-xs disabled:opacity-50"
            >
              {uploadingAvatar ? "Uploading..." : "Upload"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={onAvatarRemove}
                disabled={uploadingAvatar}
                className="site-button site-button-danger px-4 py-2 text-xs disabled:opacity-50"
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
          <div className="flex gap-2">
            <input
              id="settings-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="site-field h-12 min-w-0 flex-1 px-4 text-sm"
            />
            <button
              type="button"
              onClick={onSaveName}
              disabled={savingName || fullName === (profile.full_name ?? "")}
              className="site-button site-button-primary min-h-12 px-5 text-xs disabled:opacity-40"
            >
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Username */}
        <div className="mb-5">
          <label htmlFor="settings-username" className="mb-1.5 block text-sm font-semibold text-site-secondary">Username</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-h-12 min-w-0 flex-1 items-center gap-0 rounded-none border border-site-border-strong bg-site-canvas-alt focus-within:border-site-focus">
              <span className="pl-4 text-sm text-site-muted">mylivingpage.com/</span>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameAvail(null);
                }}
                maxLength={40}
                className="h-12 min-w-0 flex-1 bg-transparent px-1 text-sm text-site-text focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onSaveUsername}
              disabled={savingUsername || usernameChecking || !usernameChanged || !usernameAvail?.available || usernameAvail.slug !== normalizeUsernameSlug(username)}
              className="site-button site-button-primary min-h-12 px-5 text-xs disabled:opacity-40"
            >
              {savingUsername ? "Saving..." : "Save"}
            </button>
          </div>
          {usernameChecking && <p className="mt-1.5 text-xs text-site-muted" role="status">Checking...</p>}
          {usernameAvail && !usernameChecking && (
            <p className={`mt-1.5 text-xs ${usernameAvail.available ? "text-site-success" : "text-site-danger"}`} role="status">
              {usernameAvail.available ? "Available" : usernameAvail.reason}
            </p>
          )}
          <p className="mt-1.5 text-xs text-site-muted">
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
            className="site-field h-12 w-full px-4 text-sm text-site-muted disabled:opacity-80"
          />
          <p className="mt-1 text-xs text-site-muted">Email changes are not yet supported.</p>
        </div>
      </section>

      {/* ── Account Section (Password) ── */}
      {profile.hasPassword && (
        <section className="site-panel mb-5 p-5 sm:p-7">
          <h2 className="site-panel-title mb-5">Change password</h2>
          <form className="space-y-3 max-w-sm" onSubmit={onChangePassword}>
            <div>
              <label htmlFor="settings-new-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">New password</label>
              <input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="site-field h-12 w-full px-4 text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-current-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">Current password</label>
              <input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="site-field h-12 w-full px-4 text-sm"
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">Confirm password</label>
              <input
                id="settings-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Repeat password"
                className="site-field h-12 w-full px-4 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="site-button site-button-primary text-xs disabled:opacity-50"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
            {passwordMsg && (
              <p className={`text-xs ${passwordMsg.ok ? "text-site-success" : "text-site-danger"}`} role="status">{passwordMsg.text}</p>
            )}
          </form>
        </section>
      )}

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
          Your living resume, public link, ATS-ready PDF, share card, themes, and page
          analytics are available free.
        </p>
        <div className="site-callout mt-4 px-4 py-3 text-sm">
          {livePageActive
            ? "Your public page is currently live."
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
              className="site-button site-button-secondary mt-3 px-4 py-2 text-xs disabled:opacity-50"
            >
              {billingAction === "portal" ? "Loading..." : "Manage Subscription"}
            </button>
          </div>
        ) : null}
      </section>

      {/* ── Danger Zone ── */}
      <section className="site-danger-panel p-5 sm:p-7">
        <h2 className="mb-3 font-site text-lg font-semibold text-site-danger">Danger zone</h2>
        <p className="mb-4 text-sm text-site-secondary">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          ref={deleteTriggerRef}
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="site-button site-button-danger text-xs"
        >
          Delete Account
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
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={profile.username}
              className="site-field mb-4 h-12 w-full border-site-danger px-4 text-sm"
            />
            {profile.hasPassword ? (
              <input
                aria-label="Current password"
                type="password"
                autoComplete="current-password"
                value={deleteCurrentPassword}
                onChange={(e) => setDeleteCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="site-field mb-4 h-12 w-full border-site-danger px-4 text-sm"
              />
            ) : (
              <p className="mb-4 text-xs text-site-muted">
                Provider accounts must have signed in within the last 10 minutes.
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                    setDeleteCurrentPassword("");
                  }
                }}
                disabled={deleting}
                className="site-button site-button-secondary flex-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={deleteConfirmText !== profile.username || (profile.hasPassword && !deleteCurrentPassword) || deleting}
                className="site-button site-button-danger flex-1 text-xs disabled:opacity-40"
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
