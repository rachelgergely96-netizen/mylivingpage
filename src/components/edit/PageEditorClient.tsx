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
import EditorSectionNav from "@/components/edit/EditorSectionNav";
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
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [mobileWorkspaceView, setMobileWorkspaceView] = useState<"edit" | "preview">("edit");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const latestEditorSnapshotRef = useRef("");
  const [accountAccess, setAccountAccess] = useState(() =>
    getAccountAccessState({
      plan: "spark",
      billing_cohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
    }),
  );

  const { pendingDraft, saveDraft, clearDraft, dismissDraft } = useLocalDraft<EditDraft>(
    `mlp-draft-edit-${pageId}-living-page`,
  );
  const hasChanges = useMemo(() => {
    if (!data || !savedSnapshot) {
      return false;
    }

    return JSON.stringify({ data, themeId }) !== savedSnapshot;
  }, [data, savedSnapshot, themeId]);

  useEffect(() => {
    latestEditorSnapshotRef.current = data
      ? JSON.stringify({ data, themeId })
      : "";
  }, [data, themeId]);

  useUnsavedChanges(hasChanges);

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    },
    [],
  );

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
        setSavedSnapshot(JSON.stringify({ data: livingData, themeId: row.theme_id }));

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

      const submittedSnapshot = JSON.stringify({
        data: nextData,
        themeId: nextThemeId,
      });

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

        const hasNewerEdits = latestEditorSnapshotRef.current !== submittedSnapshot;
        setSavedSnapshot(submittedSnapshot);
        if (!hasNewerEdits) {
          clearDraft();
        }
        setSuccess(
          hasNewerEdits
            ? "Saved. Newer edits are still unsaved."
            : "Saved successfully!",
        );
        if (successTimerRef.current !== null) {
          window.clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = window.setTimeout(() => {
          setSuccess("");
          successTimerRef.current = null;
        }, 3000);
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

  const selectedTheme = THEME_REGISTRY.find((theme) => theme.id === themeId);
  const themePickerCollection =
    accountAccess.allowedThemeIds && !accountAccess.allowedThemeIds.includes(themeId)
      ? THEME_REGISTRY.find((theme) => theme.id === accountAccess.allowedThemeIds?.[0])
          ?.collection
      : selectedTheme?.collection;

  const showMobileWorkspaceView = (view: "edit" | "preview") => {
    setMobileWorkspaceView(view);
    window.requestAnimationFrame(() => {
      document.getElementById("editor-workspace")?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
  };

  if (loading) {
    return (
      <main className="site-container-wide max-w-6xl py-8" id="main-content">
        <div className="site-panel p-6 text-center sm:p-8">
          <div className="mx-auto h-10 w-10 animate-spin rounded-none border-2 border-site-border border-t-site-action" />
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
    <main className="site-container-wide pb-10 pt-4 sm:pt-6" id="main-content">
      <section
        aria-label="Editor commands"
        data-editor-command-bar
        className="site-panel-raised sticky top-16 z-30 px-3 py-3 sm:px-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="site-eyebrow">Living Page editor</p>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2.5">
              <h1 className="truncate font-site text-xl font-semibold tracking-[-0.03em] text-site-text sm:text-2xl">
                {data.name || "Living Page"}
              </h1>
              <span
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] ${
                  saving
                    ? "border-site-warning text-site-warning"
                    : hasChanges
                      ? "border-site-action text-site-action-hover"
                      : "border-site-border text-site-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 ${
                    saving
                      ? "animate-pulse bg-site-warning"
                      : hasChanges
                        ? "bg-site-action"
                        : "bg-site-success"
                  }`}
                />
                {saving ? "Saving changes" : hasChanges ? "Unsaved changes" : "All changes saved"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="site-button site-button-secondary min-w-0 px-3 py-2 text-xs sm:px-4"
            >
              Back
            </button>
            <Link
              href={`/${publicSlug || page?.slug || "your-username"}`}
              className="site-button site-button-secondary min-w-0 px-3 py-2 text-center text-xs sm:px-4"
            >
              View Live Page
            </Link>
            <button
              type="button"
              disabled={saving || !hasChanges}
              onClick={() => void handleSave()}
              className="site-button site-button-primary min-w-0 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div
          role="group"
          aria-label="Editor workspace view"
          className="mt-3 grid grid-cols-2 border border-site-border xl:hidden"
        >
          {(["edit", "preview"] as const).map((view) => {
            const active = mobileWorkspaceView === view;
            return (
              <button
                key={view}
                type="button"
                aria-pressed={active}
                onClick={() => showMobileWorkspaceView(view)}
                className={`min-h-10 px-3 py-2 text-xs font-semibold tracking-[0.06em] transition-colors ${
                  view === "preview" ? "border-l border-site-border" : ""
                } ${
                  active
                    ? "bg-site-selected text-site-action-hover"
                    : "bg-site-canvas-alt text-site-muted hover:text-site-text"
                }`}
              >
                {view === "edit" ? "Edit content" : "Live preview"}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4" aria-live="polite">
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
      </div>

      <div
        id="editor-workspace"
        data-editor-workspace
        className="scroll-mt-72 xl:grid xl:scroll-mt-40 xl:grid-cols-[minmax(0,46rem)_minmax(24rem,1fr)] xl:items-start xl:gap-5"
      >
        <section
          aria-labelledby="editor-content-title"
          className={`${mobileWorkspaceView === "edit" ? "block" : "hidden"} min-w-0 xl:block`}
        >
          <div className="mb-4 flex items-end justify-between gap-4 px-1">
            <div>
              <p className="site-eyebrow">Content workspace</p>
              <h2 id="editor-content-title" className="site-panel-title mt-1.5">
                Build the page in sections
              </h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs leading-5 text-site-muted sm:block">
              Changes appear in the preview before you save.
            </p>
          </div>

          <div className="space-y-5">
            <EditorSectionNav />

            {pendingDraft ? (
              <DraftBanner
                savedAt={pendingDraft.savedAt}
                onRestore={restoreDraft}
                onDiscard={dismissDraft}
              />
            ) : null}

            <section
              id="editor-section-setup"
              data-editor-section="setup"
              aria-labelledby="editor-setup-title"
              className="scroll-mt-72 xl:scroll-mt-40"
            >
              <div className="mb-3 px-1">
                <p className="site-eyebrow">Page setup</p>
                <h2 id="editor-setup-title" className="site-panel-title mt-1.5">
                  Address and profile photo
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
                <fieldset className="site-panel min-w-0 space-y-3 p-4 sm:p-5">
                  <legend className="site-eyebrow px-1">Public URL</legend>
                  <div className="min-w-0 break-all border border-site-border bg-site-canvas-alt px-3 py-2 font-mono text-sm leading-6 text-site-action">
                    mylivingpage.com/{publicSlug || page?.slug || "your-username"}
                  </div>
                  <p className="text-xs leading-5 text-site-muted">
                    This address is shared by your Living Page and downloadable résumé.
                  </p>
                </fieldset>

                <fieldset className="site-panel space-y-3 p-4 sm:p-5">
                  <legend className="site-eyebrow px-1">Profile photo</legend>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {data.avatar_url ? (
                      <Image
                        src={data.avatar_url}
                        alt="Avatar"
                        width={64}
                        height={64}
                        sizes="(min-width: 640px) 64px, 56px"
                        className="h-14 w-14 shrink-0 rounded-none border-2 border-site-action object-cover sm:h-16 sm:w-16"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-none bg-site-action font-site text-xl font-bold text-site-action-ink sm:h-16 sm:w-16 sm:text-2xl">
                        {(data.name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
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
                        className="site-button site-button-secondary w-full px-3 py-2 text-xs disabled:opacity-50"
                      >
                        {uploadingAvatar
                          ? "Uploading..."
                          : data.avatar_url
                            ? "Change Photo"
                            : "Upload Photo"}
                      </button>
                      {data.avatar_url ? (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="w-full text-left text-xs text-site-muted hover:text-site-danger"
                        >
                          Remove · use monogram
                        </button>
                      ) : (
                        <p className="text-xs leading-5 text-site-muted">JPEG, PNG, or WebP · 2 MB max</p>
                      )}
                    </div>
                  </div>
                </fieldset>
              </div>
            </section>

            <ResumeEditorFields data={data} onChange={setData} />

            <section
              id="editor-section-design"
              data-editor-section="design"
              aria-labelledby="editor-design-title"
              className="site-panel scroll-mt-72 p-4 sm:p-5 xl:scroll-mt-40"
            >
              <div className="mb-5 border-b border-site-border pb-4">
                <p className="site-eyebrow">Appearance</p>
                <div className="mt-1.5 flex flex-wrap items-end justify-between gap-3">
                  <h2 id="editor-design-title" className="site-panel-title">
                    Choose the page world
                  </h2>
                  <span className="border border-site-action bg-site-selected px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-site-action-hover">
                    {selectedTheme?.name ?? themeId}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  Your content stays the same while the visual system changes around it.
                </p>
              </div>
              <ThemePicker
                themes={THEME_REGISTRY}
                selectedThemeId={themeId}
                onSelectTheme={setThemeId}
                allowedThemeIds={accountAccess.allowedThemeIds}
                initialCollection={themePickerCollection}
                lockedLabel="Not available"
                showDescription
              />
            </section>

            <section
              id="editor-section-ats"
              data-editor-section="ats"
              aria-labelledby="editor-tools-title"
              className="scroll-mt-72 space-y-4 xl:scroll-mt-40"
            >
              <div className="px-1">
                <p className="site-eyebrow">Resume tools</p>
                <h2 id="editor-tools-title" className="site-panel-title mt-1.5">
                  Check the saved output
                </h2>
              </div>
              <div className="site-callout px-4 py-3">
                <p className="site-eyebrow">Résumé PDF</p>
                <p className="mt-2 text-sm leading-6 text-site-text">
                  The public page uses this same saved information for the downloadable Resume PDF.
                </p>
              </div>
              <AtsReadinessCard resumeData={data} />
              <p className="px-1 text-xs leading-5 text-site-muted">
                The check uses the fields currently in this editor. Save your changes before relying
                on the public PDF.
              </p>
            </section>
          </div>
        </section>

        <aside
          aria-labelledby="editor-preview-title"
          data-editor-preview
          className={`${mobileWorkspaceView === "preview" ? "block" : "hidden"} min-w-0 xl:sticky xl:top-36 xl:block`}
        >
          <section className="overflow-hidden rounded-none border border-site-border-strong bg-site-surface shadow-[var(--site-shadow-raised)]">
            <div className="flex items-start justify-between gap-4 border-b border-site-border bg-site-surface-raised px-4 py-3">
              <div>
                <p className="site-eyebrow">Live preview</p>
                <h2 id="editor-preview-title" className="mt-1 font-site text-lg font-semibold text-site-text">
                  See every edit in context
                </h2>
                <p className="mt-1 text-xs text-site-muted">Scroll inside the page to explore it.</p>
              </div>
              <span className="shrink-0 border border-site-border bg-site-canvas-alt px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] text-site-action-hover">
                {selectedTheme?.name ?? themeId}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2 border-b border-site-border bg-site-canvas-alt px-3 py-2.5">
              <span aria-hidden="true" className="h-2 w-2 bg-[#FF5F57]" />
              <span aria-hidden="true" className="h-2 w-2 bg-[#FEBC2E]" />
              <span aria-hidden="true" className="h-2 w-2 bg-[#28C840]" />
              <div className="ml-1 min-w-0 flex-1 truncate rounded-none border border-site-border bg-site-surface px-2.5 py-1 font-mono text-[10px] text-site-muted">
                mylivingpage.com/<span className="text-site-action">{publicSlug || page?.slug}</span>
              </div>
            </div>

            <ThemeCanvas
              themeId={themeId}
              height="clamp(480px, calc(100dvh - 13rem), 760px)"
              className="rounded-none"
              motionAware
            >
              <div className="h-full">
                <ResumeLayout data={data} headingLevel="h2" disableExternalLinks />
              </div>
            </ThemeCanvas>
          </section>
        </aside>
      </div>
    </main>
  );
}
