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
import EditorReadinessBriefing, {
  getReadinessSection,
} from "@/components/edit/EditorReadinessBriefing";
import EditorSectionNav, {
  type EditorSectionAnchorId,
} from "@/components/edit/EditorSectionNav";
import ResumeLayout from "@/components/ResumeLayout";
import ResumeEditorFields from "@/components/resume/ResumeEditorFields";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { buildDecisionReadinessState } from "@/lib/decision-readiness";
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
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
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
  const readiness = useMemo(
    () => (data ? buildDecisionReadinessState(data) : null),
    [data],
  );
  const signalSectionIds = useMemo<EditorSectionAnchorId[]>(() => {
    if (!data) return [];

    const sectionIds: EditorSectionAnchorId[] = [
      "editor-section-setup",
      "editor-section-design",
    ];
    if (
      data.name.trim() ||
      data.headline.trim() ||
      data.location.trim() ||
      data.email ||
      data.linkedin ||
      data.github ||
      data.website
    ) {
      sectionIds.push("editor-section-profile");
    }
    if (data.summary.trim()) sectionIds.push("editor-section-summary");
    if (data.stats.some((stat) => stat.value.trim() || stat.label.trim())) {
      sectionIds.push("editor-section-stats");
    }
    if (
      data.experience.some(
        (entry) =>
          entry.title.trim() ||
          entry.company.trim() ||
          entry.highlights.some((highlight) => highlight.trim()),
      )
    ) {
      sectionIds.push("editor-section-experience");
    }
    if (data.education.some((entry) => entry.degree.trim() || entry.school.trim())) {
      sectionIds.push("editor-section-education");
    }
    if (data.skills.some((entry) => entry.category.trim() || entry.items.some(Boolean))) {
      sectionIds.push("editor-section-skills");
    }
    if (data.projects.some((entry) => entry.name.trim() || entry.description.trim())) {
      sectionIds.push("editor-section-projects");
    }
    if (data.proofs?.some((entry) => entry.title.trim() || entry.outcome.trim())) {
      sectionIds.push("editor-section-proof");
    }
    if (data.testimonials?.some((entry) => entry.name.trim() || entry.quote.trim())) {
      sectionIds.push("editor-section-testimonials");
    }
    if (data.certifications.some((entry) => entry.name.trim() || entry.issuer?.trim())) {
      sectionIds.push("editor-section-certifications");
    }
    if (
      readiness?.checks.find((check) => check.id === "resume_pdf_health")?.status ===
      "ready"
    ) {
      sectionIds.push("editor-section-ats");
    }

    return sectionIds;
  }, [data, readiness]);

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
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (hasChanges) setCopyStatus("idle");
  }, [hasChanges]);

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

  const handleCopyLiveLink = useCallback(async () => {
    if (hasChanges || !page) return;

    const livePath = `/${publicSlug || page.slug || "your-username"}`;
    const liveUrl = `${window.location.origin.replace(/\/$/, "")}${livePath}`;

    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopyStatus("copied");
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "page.share.copy_link",
          metadata: {
            page_id: page.id,
            surface: "living_page_editor",
            mode: "link_only",
            share_path: livePath,
          },
        }),
        keepalive: true,
      }).catch(() => undefined);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopyStatus("idle");
        copyTimerRef.current = null;
      }, 2400);
    } catch {
      setCopyStatus("error");
    }
  }, [hasChanges, page, publicSlug]);

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
  const nextReadinessCheck = readiness?.checks.find(
    (check) => check.status === "needs_attention",
  );
  const nextReadinessTarget = nextReadinessCheck
    ? getReadinessSection(nextReadinessCheck.id)
    : null;
  const livePath = `/${publicSlug || page?.slug || "your-username"}`;
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
    <main className="site-container-wide overflow-x-clip pb-24 pt-4 sm:pt-6 xl:pb-10" id="main-content">
      <section
        aria-label="Editor commands"
        data-editor-command-bar
        className="site-panel-raised relative z-30 min-w-0 max-w-full overflow-hidden px-3 py-3 sm:px-4 xl:sticky xl:top-16"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.42fr)_auto] lg:items-center lg:gap-5">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mb-1 inline-flex min-h-7 items-center gap-1.5 text-[10px] font-semibold text-site-muted transition-colors hover:text-site-text"
            >
              <span aria-hidden="true">←</span>
              Dashboard
            </button>
            <p className="site-eyebrow">Signal studio · Edit your page</p>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2.5">
              <h1 className="truncate font-site text-xl font-semibold tracking-[-0.03em] text-site-text sm:text-2xl">
                {data.name || "Living Resume"}
              </h1>
              <span
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] transition-colors ${
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

          {readiness ? (
            // Persistent status readout. The per-check segmented bars live only
            // in the readiness briefing (their accessible home); here we name the
            // next gap in text, which stays useful once the briefing scrolls off.
            <div className="border-l border-site-border pl-3 sm:pl-4">
              <p className="site-eyebrow text-[9px] text-site-muted">
                Page signal
              </p>
              <p className="mt-1 text-xs font-semibold text-site-text">
                {readiness.readyCount}/{readiness.totalChecks} checks strong
              </p>
              <p className="mt-1.5 truncate text-[10px] text-site-muted">
                {nextReadinessTarget
                  ? `Next: ${nextReadinessTarget.label}`
                  : "Ready to save and share"}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-wrap lg:justify-end">
            <button
              type="button"
              disabled={saving || !hasChanges}
              onClick={() => void handleSave()}
              className="site-button site-button-primary min-w-0 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              disabled={hasChanges || copyStatus === "copied"}
              aria-describedby="editor-copy-guidance"
              onClick={() => void handleCopyLiveLink()}
              className="site-button site-button-secondary min-w-0 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              {copyStatus === "copied" ? "Link copied" : "Copy link"}
            </button>
            <Link
              href={livePath}
              className="site-button site-button-secondary min-w-0 px-3 py-2 text-center text-xs sm:px-4"
            >
              View live
            </Link>
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

        {mobileWorkspaceView === "edit" ? (
          <div
            data-editor-mobile-peek
            className="mt-2 flex min-w-0 items-center gap-2 border-l-2 border-site-action px-2 py-1 text-[10px] xl:hidden"
          >
            <span className="site-eyebrow shrink-0 text-[9px] text-site-action-hover">
              Preview signal
            </span>
            <span className="truncate text-site-muted">
              {data.headline || "Add a headline to sharpen the first impression"}
            </span>
          </div>
        ) : null}

        <EditorSectionNav signalSectionIds={signalSectionIds} />
        <p id="editor-copy-guidance" className="sr-only">
          {hasChanges
            ? "Save your latest changes before copying the live page link."
            : "Copy the saved live page link."}
        </p>
        {copyStatus === "copied" ? (
          <p role="status" className="sr-only">Live page link copied.</p>
        ) : null}
        {copyStatus === "error" ? (
          <p role="alert" className="mt-2 text-xs text-site-danger">
            The link could not be copied. Open the live page and copy its address instead.
          </p>
        ) : null}
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
              <p className="site-eyebrow">Your page, in working order</p>
              <h2 id="editor-content-title" className="site-panel-title mt-1.5">
                Shape the signal, section by section
              </h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs leading-5 text-site-muted sm:block">
              Every edit appears in the preview before it reaches your live page.
            </p>
          </div>

          <div className="space-y-5">
            {pendingDraft ? (
              <DraftBanner
                savedAt={pendingDraft.savedAt}
                onRestore={restoreDraft}
                onDiscard={dismissDraft}
              />
            ) : null}

            {readiness ? <EditorReadinessBriefing readiness={readiness} /> : null}

            <section
              id="editor-section-setup"
              data-editor-section="setup"
              aria-labelledby="editor-setup-title"
              className="scroll-mt-72 xl:scroll-mt-40"
            >
              <div className="mb-3 px-1">
                <p className="site-eyebrow">
                  <span className="mr-2 font-mono text-site-muted">01</span>
                  Page setup
                </p>
                <h2 id="editor-setup-title" className="site-panel-title mt-1.5">
                  Your address and first impression
                </h2>
                <p className="mt-2 text-xs leading-5 text-site-muted">
                  Keep the link memorable and choose the face—or monogram—people meet first.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
                <fieldset className="site-panel min-w-0 space-y-3 p-4 sm:p-5">
                  <legend className="site-eyebrow px-1">Public URL</legend>
                  <div className="min-w-0 break-all border border-site-border bg-site-canvas-alt px-3 py-2 font-mono text-sm leading-6 text-site-action">
                    mylivingpage.com/{publicSlug || page?.slug || "your-username"}
                  </div>
                  <p className="text-xs leading-5 text-site-muted">
                    This address is shared by your professional page and downloadable résumé.
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
                <p className="site-eyebrow">
                  <span className="mr-2 font-mono text-site-muted">12</span>
                  Design
                </p>
                <div className="mt-1.5 flex flex-wrap items-end justify-between gap-3">
                  <h2 id="editor-design-title" className="site-panel-title">
                    Choose the world around your story
                  </h2>
                  <span className="border border-site-action bg-site-selected px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-site-action-hover">
                    {selectedTheme?.name ?? themeId}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  Your professional story stays the same while the style changes.
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
                <p className="site-eyebrow">
                  <span className="mr-2 font-mono text-site-muted">13</span>
                  ATS &amp; job check
                </p>
                <h2 id="editor-tools-title" className="site-panel-title mt-1.5">
                  Check the saved résumé against the next role
                </h2>
                <p className="mt-2 text-xs leading-5 text-site-muted">
                  Review the PDF structure on its own, or paste one job description to make the word match visible.
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
          className={`${mobileWorkspaceView === "preview" ? "block" : "hidden"} min-w-0 xl:sticky xl:top-72 xl:block`}
        >
          <section className="overflow-hidden rounded-none border border-site-border-strong bg-site-surface shadow-[var(--site-shadow-raised)]">
            <div className="flex items-start justify-between gap-4 border-b border-site-border bg-site-surface-raised px-4 py-3">
              <div>
                <p className="site-eyebrow">What they see</p>
                <h2 id="editor-preview-title" className="mt-1 font-site text-lg font-semibold text-site-text">
                  Your page, alive while you edit
                </h2>
                <p className="mt-1 text-xs text-site-muted">Scroll the real page without leaving the studio.</p>
              </div>
              <span className="shrink-0 border border-site-border bg-site-canvas-alt px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] text-site-action-hover">
                {selectedTheme?.name ?? themeId}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2 border-b border-site-border bg-site-canvas-alt px-3 py-2.5">
              <span
                aria-hidden="true"
                className={`h-2 w-2 ${hasChanges ? "animate-pulse bg-site-warning" : "bg-site-success"}`}
              />
              <span
                data-editor-preview-status
                className={`site-eyebrow shrink-0 text-[9px] ${
                  hasChanges ? "text-site-warning" : "text-site-success"
                }`}
              >
                {hasChanges ? "Unsaved view" : "Live signal"}
              </span>
              <div className="ml-1 min-w-0 flex-1 truncate rounded-none border border-site-border bg-site-surface px-2.5 py-1 font-mono text-[10px] text-site-muted">
                mylivingpage.com/<span className="text-site-action">{publicSlug || page?.slug}</span>
              </div>
            </div>

            <ThemeCanvas
              themeId={themeId}
              height="clamp(480px, calc(100dvh - 20rem), 680px)"
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

      <nav
        aria-label="Mobile editor actions"
        data-editor-mobile-dock
        className="site-panel-raised fixed inset-x-5 bottom-3 z-40 grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-2 shadow-[var(--site-shadow-overlay)] xl:hidden"
      >
        <button
          type="button"
          onClick={() =>
            showMobileWorkspaceView(
              mobileWorkspaceView === "edit" ? "preview" : "edit",
            )
          }
          className="site-button site-button-secondary min-w-0 px-3 py-2 text-xs"
        >
          {mobileWorkspaceView === "edit" ? "Preview your page" : "Return to editing"}
        </button>
        <button
          type="button"
          disabled={saving || !hasChanges}
          onClick={() => void handleSave()}
          className="site-button site-button-primary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save now"}
        </button>
      </nav>
    </main>
  );
}
