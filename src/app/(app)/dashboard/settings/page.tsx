"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  getAccountAccessState,
  type AccountAccessState,
} from "@/lib/account-access";
import { clearBrowserLocalDraftStorage } from "@/hooks/useLocalDraft";
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

const SETTINGS_SECTION_LINKS = [
  { href: "#settings-section-identity", label: "Public identity" },
  { href: "#settings-section-access", label: "Access" },
  { href: "#settings-section-security", label: "Security" },
  { href: "#settings-section-delete", label: "Delete account" },
] as const;

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
        setDeleteCurrentPassword("");
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

  const nameChanged = fullName !== (profile.full_name ?? "");
  const usernameChanged = normalizeUsernameSlug(username) !== profile.username;
  const hasIdentityChanges = nameChanged || usernameChanged;
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

      showToast(data?.error ?? "Could not open billing portal.");
    } catch {
      showToast("Could not open billing portal.");
    } finally {
      setBillingAction(null);
    }
  };

  return (
    <main
      className="site-container-wide max-w-6xl overflow-x-clip pb-16 pt-4 sm:pt-6"
      id="main-content"
      data-settings-page
    >
      {toast && (
        <div
          className="site-panel-raised fixed right-4 top-20 z-50 max-w-[calc(100vw-2rem)] px-5 py-3 text-sm text-site-action"
          role="status"
        >
          {toast}
        </div>
      )}

      <section
        aria-label="Account settings overview"
        data-settings-command-bar
        className="site-panel-raised relative z-20 min-w-0 max-w-full overflow-hidden px-4 py-4 sm:px-5 sm:py-5 xl:sticky xl:top-16"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.38fr)] lg:items-end">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-2 inline-flex min-h-7 items-center gap-1.5 text-[10px] font-semibold text-site-muted transition-colors hover:text-site-text"
            >
              <span aria-hidden="true">←</span>
              Dashboard
            </Link>
            <p className="site-eyebrow">Signal control · Account settings</p>
            <h1 className="site-page-title mt-2 max-w-3xl">
              Keep your public identity and account in order
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-site-secondary">
              Manage the address and identity people see, then review access and account security.
              Page content stays in Signal Studio.
            </p>
          </div>

          <div className="min-w-0 border-l border-site-border pl-4">
            <p className="site-eyebrow text-[9px] text-site-muted">Saved public signal</p>
            <p className="mt-2 break-all font-mono text-sm text-site-action-hover">
              mylivingpage.com/{profile.username}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`site-badge ${livePageActive ? "site-badge-success" : "site-badge-warning"}`}
              >
                {livePageActive ? "Public page live" : "Page not live"}
              </span>
              <span
                data-settings-dirty-state
                role="status"
                aria-live="polite"
                className={`inline-flex min-h-7 items-center gap-2 border px-2.5 font-mono text-[9px] tracking-[0.08em] ${
                  hasIdentityChanges
                    ? "border-site-action text-site-action-hover"
                    : "border-site-border text-site-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 ${hasIdentityChanges ? "bg-site-action" : "bg-site-success"}`}
                />
                {hasIdentityChanges ? "Unsaved identity changes" : "Identity saved"}
              </span>
            </div>
          </div>
        </div>

        <nav
          aria-label="Account settings sections"
          data-settings-section-nav
          className="mt-4 flex max-w-full gap-2 overflow-x-auto border-t border-site-border pt-3"
        >
          {SETTINGS_SECTION_LINKS.map((section, index) => (
            <a
              key={section.href}
              href={section.href}
              className="inline-flex min-h-10 shrink-0 items-center border border-site-border bg-site-canvas-alt px-3 text-[10px] font-semibold text-site-muted transition-colors hover:border-site-action hover:text-site-text"
            >
              <span className="mr-2 font-mono text-site-action">
                {String(index + 1).padStart(2, "0")}
              </span>
              {section.label}
            </a>
          ))}
        </nav>
      </section>

      <div className="mt-5 space-y-6">
        <section
          id="settings-section-identity"
          data-settings-identity
          aria-labelledby="settings-identity-title"
          className="scroll-mt-80 xl:scroll-mt-72"
        >
          <div className="mb-3 px-1">
            <p className="site-eyebrow">
              <span className="mr-2 font-mono text-site-muted">01</span>
              Public identity
            </p>
            <h2 id="settings-identity-title" className="site-panel-title mt-1.5">
              The address and identity people remember
            </h2>
            <p className="mt-2 text-xs leading-5 text-site-muted">
              Your public address comes first. Photo, display name, and account email follow it.
            </p>
          </div>

          <div className="editor-signal-frame relative overflow-hidden border border-site-border-strong bg-site-panel p-4 sm:p-6">
            <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-nw" />
            <span aria-hidden="true" className="editor-signal-corner editor-signal-corner-se" />

            <fieldset className="border-b border-site-border pb-5">
              <legend className="site-eyebrow px-1 text-site-action-hover">Public address</legend>
              <label htmlFor="settings-username" className="sr-only">
                Public address username
              </label>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="flex min-h-12 min-w-0 flex-1 items-center border border-site-border-strong bg-site-canvas-alt focus-within:border-site-focus">
                  <span className="shrink-0 pl-3 font-mono text-[11px] text-site-muted sm:pl-4 sm:text-sm">
                    mylivingpage.com/
                  </span>
                  <input
                    id="settings-username"
                    aria-describedby="settings-username-status settings-username-help"
                    type="text"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setUsernameAvail(null);
                    }}
                    maxLength={40}
                    className="h-12 min-w-0 flex-1 bg-transparent px-1 font-mono text-sm text-site-text focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={onSaveUsername}
                  aria-describedby="settings-username-status settings-username-help"
                  disabled={savingUsername || usernameChecking || !usernameChanged || !usernameAvail?.available || usernameAvail.slug !== normalizeUsernameSlug(username)}
                  className="site-button site-button-primary min-h-12 px-5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingUsername ? "Saving address..." : "Save public address"}
                </button>
              </div>
              <p
                id="settings-username-status"
                className={`mt-2 text-xs ${
                  usernameAvail && !usernameChecking
                    ? usernameAvail.available
                      ? "text-site-success"
                      : "text-site-danger"
                    : "text-site-muted"
                }`}
                role="status"
              >
                {usernameChecking
                  ? "Checking address availability..."
                  : usernameAvail
                    ? usernameAvail.available
                      ? "Address available. Save when you are ready."
                      : usernameAvail.reason
                    : usernameChanged
                      ? "Enter an available address to enable saving."
                      : "This is the saved address people can visit."}
              </p>
              <p id="settings-username-help" className="mt-1 text-xs leading-5 text-site-muted">
                Use 3–40 letters, numbers, hyphens, underscores, or periods. Changing it also
                changes the link you share.
              </p>
            </fieldset>

            <div className="grid gap-5 pt-5 md:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)] md:gap-6">
              <fieldset className="min-w-0 md:border-r md:border-site-border md:pr-6">
                <legend className="site-eyebrow px-1">Profile photo</legend>
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-none border-2 border-site-action bg-site-canvas-alt">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={`${profile.full_name || profile.username} profile photo`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xl text-site-muted">
                        {(profile.full_name?.[0] ?? profile.username?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="site-button site-button-secondary px-4 py-2 text-xs disabled:opacity-50"
                      >
                        {uploadingAvatar ? "Uploading..." : "Upload photo"}
                      </button>
                      {avatarUrl ? (
                        <button
                          type="button"
                          onClick={onAvatarRemove}
                          disabled={uploadingAvatar}
                          className="site-button site-button-secondary px-4 py-2 text-xs disabled:opacity-50"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-site-muted">
                      JPEG, PNG, or WebP · 2 MB max
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onAvatarUpload}
                  />
                </div>
              </fieldset>

              <div className="min-w-0 space-y-5">
                <div>
                  <label htmlFor="settings-full-name" className="mb-1.5 block text-sm font-semibold text-site-secondary">
                    Display name
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="settings-full-name"
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      maxLength={100}
                      className="site-field h-12 min-w-0 flex-1 px-4 text-sm"
                    />
                    <button
                      type="button"
                      onClick={onSaveName}
                      disabled={savingName || !nameChanged}
                      className="site-button site-button-primary min-h-12 px-5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {savingName ? "Saving name..." : "Save display name"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-site-muted">
                    Shown in your account and on shared MyLivingPage surfaces.
                  </p>
                </div>

                <div>
                  <label htmlFor="settings-email" className="mb-1.5 block text-sm font-semibold text-site-secondary">
                    Account email
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    value={profile.email ?? ""}
                    disabled
                    className="site-field h-12 w-full px-4 text-sm text-site-muted disabled:opacity-80"
                  />
                  <p className="mt-1 text-xs text-site-muted">Email changes are not yet supported.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <section
            id="settings-section-access"
            data-settings-access
            aria-labelledby="settings-access-title"
            className="scroll-mt-80 xl:scroll-mt-72"
          >
            <div className="mb-3 px-1">
              <p className="site-eyebrow">
                <span className="mr-2 font-mono text-site-muted">02</span>
                Access status
              </p>
              <h2 id="settings-access-title" className="site-panel-title mt-1.5">
                What your account can use now
              </h2>
            </div>
            <div className="site-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="site-badge site-badge-success">Free access</span>
                <span className={`site-badge ${livePageActive ? "site-badge-success" : "site-badge-warning"}`}>
                  {livePageActive ? "Page live" : "Not published"}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-site-secondary">
                Your Living Resume, public link, ATS-ready PDF, share card, themes, and page
                analytics are available without a new subscription.
              </p>
              <p className="mt-3 border-l-2 border-site-action pl-3 text-xs leading-5 text-site-muted">
                {livePageActive
                  ? "Your saved public address is active now."
                  : "Publish from your dashboard whenever you are ready to make the page public."}
              </p>

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
                    {billingAction === "portal" ? "Opening billing..." : "Manage subscription"}
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section
            id="settings-section-security"
            data-settings-security
            aria-labelledby="settings-security-title"
            className="scroll-mt-80 xl:scroll-mt-72"
          >
            <div className="mb-3 px-1">
              <p className="site-eyebrow">
                <span className="mr-2 font-mono text-site-muted">03</span>
                Account security
              </p>
              <h2 id="settings-security-title" className="site-panel-title mt-1.5">
                Keep sign-in changes deliberate
              </h2>
            </div>
            <div className="site-panel p-5 sm:p-6">
              {profile.hasPassword ? (
                <details data-settings-password>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 border border-site-border bg-site-canvas-alt px-4 text-sm font-semibold text-site-text transition-colors hover:border-site-action focus-visible:border-site-focus">
                    <span>Change password</span>
                    <span className="font-mono text-[10px] font-normal text-site-muted">Open secure form</span>
                  </summary>
                  <form className="mt-5 space-y-4" onSubmit={onChangePassword}>
                    <div>
                      <label htmlFor="settings-current-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">
                        Current password
                      </label>
                      <input
                        id="settings-current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        required
                        className="site-field h-12 w-full px-4 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-new-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">
                        New password
                      </label>
                      <input
                        id="settings-new-password"
                        type="password"
                        autoComplete="new-password"
                        aria-describedby="settings-password-help"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        required
                        minLength={8}
                        className="site-field h-12 w-full px-4 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-confirm-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">
                        Confirm new password
                      </label>
                      <input
                        id="settings-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        minLength={8}
                        className="site-field h-12 w-full px-4 text-sm"
                      />
                    </div>
                    <p id="settings-password-help" className="text-xs leading-5 text-site-muted">
                      Use at least 8 characters. Your current password confirms the change.
                    </p>
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="site-button site-button-primary text-xs disabled:opacity-50"
                    >
                      {savingPassword ? "Updating password..." : "Update password"}
                    </button>
                    {passwordMsg ? (
                      <p className={`text-xs ${passwordMsg.ok ? "text-site-success" : "text-site-danger"}`} role="status">
                        {passwordMsg.text}
                      </p>
                    ) : null}
                  </form>
                </details>
              ) : (
                <div data-settings-provider-access className="border-l-2 border-site-action px-4 py-2">
                  <p className="text-sm font-semibold text-site-text">Provider sign-in is active</p>
                  <p className="mt-2 text-sm leading-6 text-site-secondary">
                    This account does not use a MyLivingPage password. Manage sign-in security with
                    your identity provider.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <section
          id="settings-section-delete"
          data-settings-delete
          aria-labelledby="settings-delete-title"
          className="scroll-mt-80 border-t border-site-border pt-6 xl:scroll-mt-72"
        >
          <div className="mb-3 px-1">
            <p className="site-eyebrow text-site-danger">
              <span className="mr-2 font-mono text-site-muted">04</span>
              Permanent action
            </p>
          </div>
          <div className="site-danger-panel p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="max-w-2xl">
                <h2 id="settings-delete-title" className="font-site text-lg font-semibold text-site-danger">
                  Delete account
                </h2>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  Permanently delete your profile, pages, and page activity. This cannot be undone.
                </p>
              </div>
              <button
                ref={deleteTriggerRef}
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="site-button site-button-danger shrink-0 text-xs"
              >
                Start account deletion
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div ref={deleteDialogRef} tabIndex={-1} className="site-panel-raised w-full max-w-md border-site-danger p-6 sm:p-7" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description">
            <h3 id="delete-account-title" className="mb-3 font-site text-xl font-semibold text-site-danger">Delete account</h3>
            <p id="delete-account-description" className="mb-4 text-sm text-site-secondary">
              This will permanently delete your profile, all pages, and page activity data. If you have an active paid subscription, it will be canceled before deletion and no refund is issued except where required by law. Type <span className="font-mono text-site-danger">{profile.username}</span> to confirm.
            </p>
            <label htmlFor="settings-delete-confirmation" className="mb-1.5 block text-sm font-semibold text-site-secondary">
              Type {profile.username} to confirm
            </label>
            <input
              id="settings-delete-confirmation"
              ref={deleteInputRef}
              aria-label={`Type ${profile.username} to confirm account deletion`}
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={profile.username}
              className="site-field mb-4 h-12 w-full border-site-danger px-4 text-sm"
            />
            {profile.hasPassword ? (
              <div>
                <label htmlFor="settings-delete-current-password" className="mb-1.5 block text-sm font-semibold text-site-secondary">
                  Current password
                </label>
                <input
                  id="settings-delete-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={deleteCurrentPassword}
                  onChange={(e) => setDeleteCurrentPassword(e.target.value)}
                  className="site-field mb-4 h-12 w-full border-site-danger px-4 text-sm"
                />
              </div>
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
