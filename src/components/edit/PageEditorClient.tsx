"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PUBLISH_CC_TRIAL_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";
import AtsReadinessCard from "@/components/AtsReadinessCard";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ResumeEditorFields from "@/components/resume/ResumeEditorFields";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type { PageRecord, ResumeData } from "@/types/resume";

interface EditDraft {
  data: ResumeData;
  themeId: ThemeId;
}

interface PageEditorClientProps {
  pageId: string;
}

function normalizeLegacyResumeData(data: ResumeData) {
  const next = { ...data };

  if (next.skills?.length && typeof next.skills[0] === "string") {
    next.skills = [{ category: "General", items: next.skills as unknown as string[] }];
  }

  if (next.certifications?.length && typeof next.certifications[0] === "string") {
    next.certifications = (next.certifications as unknown as string[]).map((item) => ({
      name: item,
      issuer: null,
      date: null,
    }));
  }

  next.proofs = next.proofs ?? [];
  next.testimonials = next.testimonials ?? [];

  return next;
}

export default function PageEditorClient({ pageId }: PageEditorClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState<PageRecord | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>("cosmic");
  const [publicSlug, setPublicSlug] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [accountAccess, setAccountAccess] = useState(() =>
    getAccountAccessState({
      plan: "spark",
      billing_cohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
    }),
  );

  const { pendingDraft, saveDraft, clearDraft, dismissDraft } = useLocalDraft<EditDraft>(
    `mlp-draft-edit-${pageId}-living-page`,
  );
  const initialSnapshotRef = useRef<string>("");

  const hasChanges = useMemo(() => {
    if (!data || !initialSnapshotRef.current) {
      return false;
    }

    return JSON.stringify({ data, themeId }) !== initialSnapshotRef.current;
  }, [data, themeId]);

  useUnsavedChanges(hasChanges);

  useEffect(() => {
    if (!hasChanges || !data) {
      return;
    }

    saveDraft({
      data,
      themeId,
    });
  }, [data, hasChanges, saveDraft, themeId]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }

    const draft = pendingDraft.data;
    setData(draft.data);
    setThemeId(draft.themeId);
    dismissDraft();
  }, [dismissDraft, pendingDraft]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/pages/${pageId}`);
        if (response.status === 401) {
          router.push("/login?next=/dashboard");
          return;
        }
        if (!response.ok) {
          setError("Page not found or you don't have access.");
          setLoading(false);
          return;
        }

        const row = (await response.json()) as PageRecord;
        const livingData = normalizeLegacyResumeData({ ...row.resume_data });

        setPage(row);
        setData(livingData);
        setThemeId(row.theme_id as ThemeId);
        setPublicSlug(row.slug);
        initialSnapshotRef.current = JSON.stringify({ data: livingData, themeId: row.theme_id });

        const profileResponse = await fetch("/api/profile");
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as {
            plan?: string;
            username?: string;
            billing_cohort?: string | null;
            hosting_trial_started_at?: string | null;
            stripe_subscription_status?: string | null;
            stripe_trial_ends_at?: string | null;
          };
          setAccountAccess(
            getAccountAccessState({
              plan: profile.plan ?? "spark",
              billing_cohort: profile.billing_cohort ?? null,
              hosting_trial_started_at: profile.hosting_trial_started_at ?? null,
              stripe_subscription_status: profile.stripe_subscription_status ?? null,
              stripe_trial_ends_at: profile.stripe_trial_ends_at ?? null,
            }),
          );
          setPublicSlug(profile.username ?? row.slug);
        }
      } catch {
        setError("Failed to load page.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [pageId, router]);

  useEffect(() => {
    if (
      accountAccess.allowedThemeIds &&
      !accountAccess.allowedThemeIds.includes(themeId)
    ) {
      setThemeId(accountAccess.allowedThemeIds[0] ?? "cosmic");
    }
  }, [accountAccess.allowedThemeIds, themeId]);

  const persistPage = useCallback(
    async (nextData: ResumeData, nextThemeId = themeId) => {
      if (!page || saving) {
        return false;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      try {
        const payload: Record<string, unknown> = {
          resume_data: nextData,
          theme_id: nextThemeId,
          updated_at: new Date().toISOString(),
        };
        const saveResponse = await fetch(`/api/pages/${page.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!saveResponse.ok) {
          const body = (await saveResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Save failed.");
        }

        setData(nextData);
        setThemeId(nextThemeId);
        clearDraft();
        initialSnapshotRef.current = JSON.stringify({ data: nextData, themeId: nextThemeId });
        setSuccess("Saved successfully!");
        setTimeout(() => setSuccess(""), 3000);
        return true;
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [clearDraft, page, saving, themeId],
  );

  const handleSave = useCallback(async () => {
    if (!data || !page || saving || !hasChanges) {
      return;
    }

    await persistPage(data, themeId);
  }, [data, hasChanges, page, persistPage, saving, themeId]);

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/avatar", { method: "POST", body: form });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        throw new Error(json.error ?? "Upload failed.");
      }

      setData((prev) => (prev ? { ...prev, avatar_url: json.url as string } : prev));
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    await fetch("/api/avatar", { method: "DELETE" });
    setData((prev) => (prev ? { ...prev, avatar_url: null } : prev));
  };

  if (loading) {
    return (
      <main className="site-container-wide max-w-6xl py-8" id="main-content">
        <div className="site-panel p-6 text-center sm:p-8">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-site-border border-t-site-action" />
          <p className="mt-4 text-sm text-site-muted" role="status">Loading page...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="site-container-wide max-w-6xl py-8" id="main-content">
        <div className="site-panel p-6 text-center sm:p-8">
          <p className="text-sm text-site-danger" role="alert">{error || "Page not found."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="site-container-wide max-w-6xl py-8" id="main-content">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <p className="site-eyebrow">Living Page editor</p>
          <h1 className="site-page-title mt-2 text-3xl">
            {data.name || "Living Page"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="site-button site-button-secondary px-4 py-2 text-xs sm:px-5 sm:py-2.5"
          >
            Back
          </button>
          <Link
            href={`/${publicSlug || page?.slug || "your-username"}`}
            className="site-button site-button-secondary px-4 py-2 text-xs sm:px-5 sm:py-2.5"
          >
            View Live Page
          </Link>
          <button
            type="button"
            disabled={saving || !hasChanges}
            onClick={() => void handleSave()}
            className="site-button site-button-primary px-5 py-2 text-xs disabled:opacity-60 sm:px-6 sm:py-2.5"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="site-alert-danger mb-4 px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="site-alert-success mb-4 px-4 py-3 text-sm" role="status">
          {success}
        </p>
      ) : null}

      {pendingDraft ? (
        <DraftBanner savedAt={pendingDraft.savedAt} onRestore={restoreDraft} onDiscard={dismissDraft} />
      ) : null}

      <div className="site-callout mb-4 px-4 py-3">
        <p className="site-eyebrow">Résumé PDF</p>
        <p className="mt-2 text-sm text-site-text">
          The public page always uses this saved information for the downloadable Resume PDF.
        </p>
      </div>

      <div className="mb-5">
        <AtsReadinessCard resumeData={data} />
        <p className="mt-2 px-1 text-xs leading-5 text-site-muted">
          The check uses the fields currently in this editor. Save your changes before relying on
          the public PDF.
        </p>
      </div>

      <div className="space-y-5">
        <fieldset className="site-panel space-y-3 p-4 sm:p-5">
          <legend className="site-eyebrow px-1">Public URL</legend>
          <div className="border border-site-border bg-site-canvas-alt px-3 py-2 font-mono text-sm text-site-action">
            mylivingpage.com/{publicSlug || page?.slug || "your-username"}
          </div>
        </fieldset>

        <fieldset className="site-panel space-y-3 p-4 sm:p-5">
          <legend className="site-eyebrow px-1">Avatar</legend>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            {data.avatar_url ? (
              <Image
                src={data.avatar_url}
                alt="Avatar"
                width={64}
                height={64}
                sizes="(min-width: 640px) 64px, 56px"
                className="h-14 w-14 rounded-none border-2 border-site-action object-cover sm:h-16 sm:w-16"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-none bg-site-action font-site text-xl font-bold text-site-action-ink sm:h-16 sm:w-16 sm:text-2xl">
                {(data.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleAvatarUpload(file);
                  }
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
                className="site-button site-button-secondary px-4 py-2 text-xs disabled:opacity-50"
              >
                {uploadingAvatar ? "Uploading..." : data.avatar_url ? "Change Photo" : "Upload Photo"}
              </button>
              {data.avatar_url ? (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="text-xs text-site-muted hover:text-site-danger"
                >
                  Remove · use monogram
                </button>
              ) : (
                <p className="text-xs text-site-muted">Optional · JPEG, PNG, or WebP under 2 MB</p>
              )}
            </div>
          </div>
        </fieldset>

        <ResumeEditorFields data={data} onChange={setData} />

        <ThemePicker
          themes={THEME_REGISTRY}
          selectedThemeId={themeId}
          onSelectTheme={setThemeId}
          allowedThemeIds={accountAccess.allowedThemeIds}
          lockedLabel="Not available"
          showDescription
        />

        <div className="overflow-hidden rounded-none border border-site-border-strong">
          <div className="flex items-center gap-2 border-b border-site-border bg-site-canvas-alt px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <div className="ml-3 rounded-none border border-site-border bg-site-surface px-3 py-1 font-mono text-[11px] text-site-muted">
              mylivingpage.com/<span className="text-site-action">{publicSlug || page?.slug}</span>
            </div>
          </div>
          <ThemeCanvas
            themeId={themeId}
            height="min(600px, calc(100dvh - 250px))"
            className="rounded-none"
            motionAware
          >
            <div className="h-full">
              <ResumeLayout data={data} />
            </div>
          </ThemeCanvas>
        </div>
      </div>
    </main>
  );
}
