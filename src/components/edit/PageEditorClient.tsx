"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AtsPdfPreviewCard from "@/components/ats/AtsPdfPreviewCard";
import AtsReviewPanel from "@/components/ats/AtsReviewPanel";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ResumeEditorFields from "@/components/resume/ResumeEditorFields";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  buildAtsRelevantFingerprint,
  buildResumeContentHash,
  createRuleBasedAtsReview,
  finalizeApprovedAtsResume,
  getAtsApprovalStatus,
  getAtsAvailabilityReason,
  getDefaultAtsTargeting,
  hasApprovedAtsResume,
  inheritApprovedAtsResume,
  isAtsOutOfSync,
  normalizeResumeDataForAts,
  reconcileAtsApprovalStatus,
  resolveEditableAtsResumeData,
  setAtsApprovalStatus,
} from "@/lib/ats-review";
import { isPremiumPlan } from "@/lib/plans";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type {
  AtsExportCheck,
  AtsReviewMode,
  AtsTargeting,
  PageConfig,
  PageRecord,
  ResumeData,
} from "@/types/resume";

export type PageEditorMode = "living-page" | "ats-resume";

interface EditDraft {
  data: ResumeData;
  atsData: ResumeData;
  themeId: ThemeId;
  pageConfig: PageConfig;
  atsTargeting: AtsTargeting;
}

interface PageEditorClientProps {
  pageId: string;
  mode: PageEditorMode;
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

  return next;
}

function buildAtsStatusMessage(
  atsReview: NonNullable<PageConfig["ats"]> | null,
  livingData: ResumeData | null,
) {
  if (!livingData) {
    return "Loading ATS status...";
  }

  const approvalStatus = getAtsApprovalStatus(atsReview, livingData);
  if (approvalStatus === "out_of_sync") {
    return "Your living page changed after ATS approval. Review and re-approve the ATS resume before download is available again.";
  }

  if (approvalStatus === "approved" && hasApprovedAtsResume(atsReview, livingData)) {
    return "ATS PDF ready on the live page.";
  }

  if (atsReview?.candidateResumeData) {
    return getAtsAvailabilityReason(atsReview);
  }

  return "ATS resume not generated yet. Use the ATS editor to build it.";
}

export default function PageEditorClient({ pageId, mode }: PageEditorClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState<PageRecord | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const [atsData, setAtsData] = useState<ResumeData | null>(null);
  const [pageConfig, setPageConfig] = useState<PageConfig>({});
  const [themeId, setThemeId] = useState<ThemeId>("cosmic");
  const [publicSlug, setPublicSlug] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [userPlan, setUserPlan] = useState<string>("spark");
  const premium = isPremiumPlan(userPlan);
  const [atsTargeting, setAtsTargeting] = useState<AtsTargeting>({
    primaryTitle: "",
    titleVariants: [],
    jobDescription: "",
    lastExtractedKeywords: [],
  });
  const [reviewingAts, setReviewingAts] = useState(false);
  const atsReviewAbortRef = useRef<AbortController | null>(null);
  const atsReviewRequestIdRef = useRef(0);

  const { pendingDraft, saveDraft, clearDraft, dismissDraft } = useLocalDraft<EditDraft>(
    `mlp-draft-edit-${pageId}-${mode}`,
  );
  const initialLivingSnapshotRef = useRef<string>("");
  const initialAtsSnapshotRef = useRef<string>("");
  const atsReview = pageConfig.ats ?? null;

  const currentAtsPreviewHash = useMemo(() => {
    if (!atsData) {
      return null;
    }

    return buildResumeContentHash(normalizeResumeDataForAts(atsData), atsTargeting);
  }, [atsData, atsTargeting]);

  const hasLivingChanges = useMemo(() => {
    if (!data || !initialLivingSnapshotRef.current) {
      return false;
    }

    return JSON.stringify({ data, themeId }) !== initialLivingSnapshotRef.current;
  }, [data, themeId]);

  const hasAtsChanges = useMemo(() => {
    if (!atsData || !initialAtsSnapshotRef.current) {
      return false;
    }

    return JSON.stringify({ atsData, atsTargeting, atsReview }) !== initialAtsSnapshotRef.current;
  }, [atsData, atsReview, atsTargeting]);

  const currentModeDirty = mode === "living-page" ? hasLivingChanges : hasAtsChanges;
  const atsOutOfSync = useMemo(() => (data ? isAtsOutOfSync(atsReview, data) : false), [atsReview, data]);
  const atsStatusMessage = useMemo(() => buildAtsStatusMessage(atsReview, data), [atsReview, data]);
  const canApproveAts =
    Boolean(atsReview) &&
    Boolean(atsData) &&
    (atsReview?.candidateExportCheck?.fitsOnOnePage ?? atsReview?.exportCheck.fitsOnOnePage ?? false);

  useUnsavedChanges(currentModeDirty);

  useEffect(() => {
    if (!currentModeDirty || !data || !atsData) {
      return;
    }

    saveDraft({
      data,
      atsData,
      themeId,
      pageConfig,
      atsTargeting,
    });
  }, [atsData, atsTargeting, currentModeDirty, data, pageConfig, saveDraft, themeId]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }

    const draft = pendingDraft.data;
    setData(draft.data);
    setAtsData(draft.atsData);
    setThemeId(draft.themeId);
    setPageConfig(draft.pageConfig ?? {});
    setAtsTargeting(draft.atsTargeting);
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
        const nextPageConfig = row.page_config ?? {};
        const editableAtsData = resolveEditableAtsResumeData(nextPageConfig.ats, livingData);
        const nextTargeting = nextPageConfig.ats?.targeting ?? getDefaultAtsTargeting(editableAtsData);

        setPage(row);
        setData(livingData);
        setAtsData(editableAtsData);
        setPageConfig(nextPageConfig);
        setThemeId(row.theme_id as ThemeId);
        setPublicSlug(row.slug);
        setAtsTargeting(nextTargeting);
        initialLivingSnapshotRef.current = JSON.stringify({ data: livingData, themeId: row.theme_id });
        initialAtsSnapshotRef.current = JSON.stringify({
          atsData: editableAtsData,
          atsTargeting: nextTargeting,
          atsReview: nextPageConfig.ats ?? null,
        });

        const profileResponse = await fetch("/api/profile");
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as { plan?: string; username?: string };
          setUserPlan(profile.plan ?? "spark");
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
    return () => {
      atsReviewAbortRef.current?.abort();
    };
  }, []);

  const trackOptimizeEvent = useCallback(async (eventName: string, metadata: Record<string, unknown> = {}) => {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ eventName, metadata }),
      });
    } catch {
      // Ignore tracking failures.
    }
  }, []);

  const checkAtsExport = useCallback(
    async (resumeData: ResumeData) => {
      const response = await fetch("/api/resume/export/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      });

      if (response.status === 401) {
        router.push("/login?next=/dashboard");
        return null;
      }

      const payload = (await response.json().catch(() => null)) as
        | Partial<AtsExportCheck> & { error?: string }
        | null;

      if (!response.ok || !payload || "error" in payload) {
        throw new Error(payload?.error ?? "Unable to validate the ATS PDF.");
      }

      return payload as AtsExportCheck;
    },
    [router],
  );

  const buildPersistedAtsReview = useCallback(
    async ({
      nextAtsData,
      nextTargeting,
      approvalAction,
    }: {
      nextAtsData: ResumeData;
      nextTargeting: AtsTargeting;
      approvalAction: "keep" | "approve";
    }) => {
      const exportCheck = await checkAtsExport(nextAtsData);
      if (!exportCheck) {
        return null;
      }

      const baseReview = createRuleBasedAtsReview({
        data: nextAtsData,
        targeting: nextTargeting,
        exportCheck,
        mode: "fast",
      });
      const inherited = inheritApprovedAtsResume(baseReview, atsReview);

      if (approvalAction === "approve") {
        return finalizeApprovedAtsResume(
          inherited,
          nextAtsData,
          data ? buildAtsRelevantFingerprint(data) : null,
        );
      }

      return reconcileAtsApprovalStatus({
        review: inherited,
        draftData: nextAtsData,
        sourceData: data,
      });
    },
    [atsReview, checkAtsExport, data],
  );

  const runAtsReview = useCallback(
    async ({
      mode = "full",
      overrideData,
      overrideTargeting,
    }: {
      mode?: AtsReviewMode;
      overrideData?: ResumeData;
      overrideTargeting?: AtsTargeting;
    } = {}) => {
      const nextData = overrideData ?? atsData;
      const nextTargeting = overrideTargeting ?? atsTargeting;
      if (!nextData) {
        return null;
      }

      const requestId = atsReviewRequestIdRef.current + 1;
      atsReviewRequestIdRef.current = requestId;
      atsReviewAbortRef.current?.abort();
      const controller = new AbortController();
      atsReviewAbortRef.current = controller;

      if (mode === "full") {
        setReviewingAts(true);
      }
      setError("");

      try {
        const response = await fetch("/api/generate/ats-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            resumeData: nextData,
            rawResume: page?.raw_resume ?? "",
            targeting: nextTargeting,
            appliedSuggestionIds: atsReview?.appliedSuggestionIds ?? [],
            mode,
          }),
        });

        if (response.status === 401) {
          router.push("/login?next=/dashboard");
          return null;
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        if (!response.ok || !payload || typeof payload !== "object" || "error" in payload) {
          const failure = payload as { error?: string } | null;
          throw new Error(failure?.error ?? "ATS review failed.");
        }

        if (requestId !== atsReviewRequestIdRef.current) {
          return null;
        }

        const result = reconcileAtsApprovalStatus({
          review: inheritApprovedAtsResume(payload as NonNullable<PageConfig["ats"]>, atsReview),
          draftData: nextData,
          sourceData: data ?? nextData,
        });

        setAtsTargeting(result.targeting);
        setPageConfig((prev) => ({ ...prev, ats: result }));
        void trackOptimizeEvent("ats.review.run", {
          mode,
          page_id: page?.id,
          issues: result.issues.length,
          fits_one_page: result.candidateExportCheck?.fitsOnOnePage ?? result.exportCheck.fitsOnOnePage,
        });
        return result;
      } catch (reviewError) {
        if (reviewError instanceof DOMException && reviewError.name === "AbortError") {
          return null;
        }

        setError(reviewError instanceof Error ? reviewError.message : "Unable to review ATS searchability.");
        return null;
      } finally {
        if (mode === "full" && requestId === atsReviewRequestIdRef.current) {
          setReviewingAts(false);
        }
        if (requestId === atsReviewRequestIdRef.current) {
          atsReviewAbortRef.current = null;
        }
      }
    },
    [atsData, atsReview, atsTargeting, data, page?.id, page?.raw_resume, router, trackOptimizeEvent],
  );

  const persistPage = useCallback(
    async (
      nextData: ResumeData,
      nextAtsData: ResumeData,
      nextPageConfig: PageConfig,
      nextThemeId = themeId,
      nextTargeting = atsTargeting,
    ) => {
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
          page_config: nextPageConfig,
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
        setAtsData(nextAtsData);
        setPageConfig(nextPageConfig);
        setThemeId(nextThemeId);
        setAtsTargeting(nextTargeting);
        clearDraft();
        initialLivingSnapshotRef.current = JSON.stringify({ data: nextData, themeId: nextThemeId });
        initialAtsSnapshotRef.current = JSON.stringify({
          atsData: nextAtsData,
          atsTargeting: nextTargeting,
          atsReview: nextPageConfig.ats ?? null,
        });
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
    [atsTargeting, clearDraft, page, saving, themeId],
  );

  const handleLivingSave = useCallback(async () => {
    if (!data || !atsData || !page || saving) {
      return;
    }

    if (!hasLivingChanges) {
      return;
    }

    let nextAtsReview = pageConfig.ats ?? null;
    if (nextAtsReview?.approvedSourceFingerprint) {
      const nextFingerprint = buildAtsRelevantFingerprint(data);
      if (nextAtsReview.approvedSourceFingerprint !== nextFingerprint) {
        nextAtsReview = setAtsApprovalStatus(nextAtsReview, "out_of_sync");
      } else if (nextAtsReview.approvalStatus === "out_of_sync") {
        nextAtsReview = setAtsApprovalStatus(nextAtsReview, "approved");
      }
    }

    await persistPage(
      data,
      atsData,
      { ...pageConfig, ats: nextAtsReview },
      themeId,
      atsTargeting,
    );
  }, [atsData, atsTargeting, data, hasLivingChanges, page, pageConfig, persistPage, saving, themeId]);

  const handleAtsSave = useCallback(async () => {
    if (!data || !atsData || !page || saving) {
      return;
    }

    if (!hasAtsChanges && !atsReview) {
      return;
    }

    const nextReview = await buildPersistedAtsReview({
      nextAtsData: atsData,
      nextTargeting: atsTargeting,
      approvalAction: "keep",
    });
    if (!nextReview) {
      return;
    }

    await persistPage(
      data,
      atsData,
      { ...pageConfig, ats: nextReview },
      themeId,
      atsTargeting,
    );
  }, [atsData, atsReview, atsTargeting, buildPersistedAtsReview, data, hasAtsChanges, page, pageConfig, persistPage, saving, themeId]);

  const handleApproveAtsResume = useCallback(async () => {
    if (!data || !atsData || !page || saving) {
      return;
    }

    const nextReview = await buildPersistedAtsReview({
      nextAtsData: atsData,
      nextTargeting: atsTargeting,
      approvalAction: "approve",
    });
    if (!nextReview) {
      return;
    }

    if (!hasApprovedAtsResume(nextReview, data)) {
      setError(getAtsAvailabilityReason(nextReview));
      return;
    }

    const saved = await persistPage(
      data,
      atsData,
      { ...pageConfig, ats: nextReview },
      themeId,
      atsTargeting,
    );

    if (saved) {
      setSuccess("ATS resume approved. PDF download is live on your public page.");
      void trackOptimizeEvent("ats.resume.approved", {
        page_id: page.id,
      });
    }
  }, [atsData, atsTargeting, buildPersistedAtsReview, data, page, pageConfig, persistPage, saving, themeId, trackOptimizeEvent]);

  const handleUseAutoOptimizedVersion = useCallback(() => {
    if (!atsReview?.candidateResumeData) {
      return;
    }

    setAtsData(normalizeResumeDataForAts(atsReview.candidateResumeData));
    setPageConfig((prev) => (
      prev.ats
        ? { ...prev, ats: setAtsApprovalStatus(prev.ats, "pending") }
        : prev
    ));
    setSuccess("Auto-optimized ATS draft loaded. Save when you're ready.");
    setTimeout(() => setSuccess(""), 3000);
    void trackOptimizeEvent("ats.proposal.accepted", {
      page_id: page?.id,
      accepted_count: atsReview.changeSummary.length || 1,
    });
  }, [atsReview, page?.id, trackOptimizeEvent]);

  const handleResetFromLivingPage = useCallback(async () => {
    if (!data) {
      return;
    }

    const nextAtsData = normalizeResumeDataForAts(data);
    const nextTargeting = {
      ...getDefaultAtsTargeting(nextAtsData),
      jobDescription: atsTargeting.jobDescription,
    };
    const nextReview = await buildPersistedAtsReview({
      nextAtsData,
      nextTargeting,
      approvalAction: "keep",
    });
    if (!nextReview) {
      return;
    }

    setAtsData(nextAtsData);
    setAtsTargeting(nextTargeting);
    setPageConfig((prev) => ({ ...prev, ats: nextReview }));
    setSuccess("ATS resume reset from the living page. Save when you're ready.");
    setTimeout(() => setSuccess(""), 3000);
    void trackOptimizeEvent("ats.reset_from_living_page", {
      page_id: page?.id,
    });
  }, [atsTargeting.jobDescription, buildPersistedAtsReview, data, page?.id, trackOptimizeEvent]);

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
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10">
        <div className="glass-card rounded-2xl p-6 text-center sm:p-8">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[rgba(59,130,246,0.2)] border-t-[#3B82F6]" />
          <p className="mt-4 text-sm text-[rgba(240,244,255,0.5)]">Loading page...</p>
        </div>
      </main>
    );
  }

  if (!data || !atsData) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10">
        <div className="glass-card rounded-2xl p-6 text-center sm:p-8">
          <p className="text-sm text-[#ff8e8e]">{error || "Page not found."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:mb-6 sm:flex-row sm:items-end sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">
            {mode === "living-page" ? "Living Page Editor" : "ATS Resume Editor"}
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
            {mode === "living-page" ? data.name || "Living Page" : `${data.name || "Your"} ATS Resume`}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:text-[#93C5FD] sm:px-5 sm:py-2.5"
          >
            Back
          </button>
          <Link
            href={
              mode === "living-page"
                ? `/dashboard/edit/${pageId}/ats-resume`
                : `/dashboard/edit/${pageId}/living-page`
            }
            className="rounded-full border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#93C5FD] hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE] sm:px-5 sm:py-2.5"
          >
            {mode === "living-page" ? "Open ATS Editor" : "Open Living Page Editor"}
          </Link>
          <button
            type="button"
            disabled={saving || !currentModeDirty}
            onClick={() => void (mode === "living-page" ? handleLivingSave() : handleAtsSave())}
            className="gold-pill px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-60 sm:px-6 sm:py-2.5"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-[rgba(255,120,120,0.35)] bg-[rgba(255,120,120,0.08)] px-4 py-3 text-sm text-[#ff8e8e]">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-xl border border-[rgba(100,220,100,0.35)] bg-[rgba(100,220,100,0.08)] px-4 py-3 text-sm text-[#88ee88]">
          {success}
        </p>
      ) : null}

      {pendingDraft ? (
        <DraftBanner savedAt={pendingDraft.savedAt} onRestore={restoreDraft} onDiscard={dismissDraft} />
      ) : null}

      <div className="mb-4 rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">ATS PDF status</p>
        <p className="mt-2 text-sm text-[#F0F4FF]">{atsStatusMessage}</p>
      </div>

      {mode === "living-page" ? (
        <div className="space-y-5">
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Public URL</legend>
            <div className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD]">
              mylivingpage.com/{publicSlug || page?.slug || "your-username"}
            </div>
          </fieldset>

          <div
            className={`rounded-2xl border p-4 ${
              atsOutOfSync
                ? "border-[rgba(255,120,120,0.24)] bg-[rgba(255,120,120,0.08)] text-[#FFD5D5]"
                : "border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] text-[#E8F2FF]"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.16em]">
              {atsOutOfSync ? "ATS Resume Out of Sync" : "ATS Resume Linked"}
            </p>
            <p className="mt-2 text-sm leading-6">
              {atsOutOfSync
                ? "Saving these living-page changes will keep the page live, but the ATS resume will need a fresh review and approval."
                : "Living-page edits stay separate from ATS editing, but significant copy changes can require ATS re-approval later."}
            </p>
          </div>

          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Avatar</legend>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              {data.avatar_url ? (
                <Image
                  src={data.avatar_url}
                  alt="Avatar"
                  width={64}
                  height={64}
                  sizes="(min-width: 640px) 64px, 56px"
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-[#3B82F6] shadow-[0_0_28px_rgba(59,130,246,0.3)] sm:h-16 sm:w-16"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#E8845C] font-heading text-xl font-bold text-[#0a1628] shadow-[0_0_28px_rgba(59,130,246,0.3)] sm:h-16 sm:w-16 sm:text-2xl">
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
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-1.5 text-xs uppercase tracking-[0.12em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD] disabled:opacity-50"
                >
                  {uploadingAvatar ? "Uploading..." : data.avatar_url ? "Change Photo" : "Upload Photo"}
                </button>
                {data.avatar_url ? (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="text-xs text-[rgba(240,244,255,0.35)] hover:text-[#ff8e8e]"
                  >
                    Remove · use monogram
                  </button>
                ) : (
                  <p className="text-[10px] text-[rgba(240,244,255,0.3)]">Optional · JPEG, PNG, or WebP under 2 MB</p>
                )}
              </div>
            </div>
          </fieldset>

          <ResumeEditorFields data={data} onChange={setData} mode="living" />

          <ThemePicker
            themes={THEME_REGISTRY}
            selectedThemeId={themeId}
            onSelectTheme={setThemeId}
            premium={premium}
            showDescription
          />

          <div className="overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.18)]">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.35)] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              <div className="ml-3 rounded-md bg-[rgba(255,255,255,0.06)] px-3 py-1 font-mono text-[11px] text-[rgba(240,244,255,0.5)]">
                mylivingpage.com/<span className="text-[#93C5FD]">{publicSlug || page?.slug}</span>
              </div>
            </div>
            <ThemeCanvas themeId={themeId} height="min(600px, calc(100dvh - 250px))" className="rounded-none">
              <div className="h-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.58)_100%)]">
                <ResumeLayout data={data} />
              </div>
            </ThemeCanvas>
          </div>
        </div>
      ) : null}

      {mode === "ats-resume" ? (
        <div className="space-y-5">
          <div
            className={`rounded-2xl border p-4 ${
              atsOutOfSync
                ? "border-[rgba(255,120,120,0.24)] bg-[rgba(255,120,120,0.08)] text-[#FFD5D5]"
                : "border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] text-[#E8F2FF]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em]">
                  {atsOutOfSync ? "Out of Sync" : "Separate ATS Resume"}
                </p>
                <p className="mt-2 text-sm leading-6">
                  {atsOutOfSync
                    ? "Your living page changed after this ATS version was approved. Review the current ATS draft and approve it again when it is ready."
                    : "This editor is separate from the living page. Update it as much as you need without changing the public page copy."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleResetFromLivingPage()}
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  Reset from Living Page
                </button>
                <button
                  type="button"
                  onClick={() => void runAtsReview({ mode: "full" })}
                  className="rounded-full border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE]"
                >
                  Rerun ATS Suggestions
                </button>
                <button
                  type="button"
                  onClick={() => void handleApproveAtsResume()}
                  disabled={!canApproveAts || saving}
                  className="gold-pill px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all disabled:opacity-50"
                >
                  Approve ATS Resume
                </button>
              </div>
            </div>
          </div>

          <AtsPdfPreviewCard
            resumeData={atsData}
            contentHash={currentAtsPreviewHash}
            autoGenerate
          />

          <ResumeEditorFields data={atsData} onChange={setAtsData} mode="ats" />

          <AtsReviewPanel
            data={atsData}
            review={atsReview}
            targeting={atsTargeting}
            previewResumeData={atsData}
            previewContentHash={currentAtsPreviewHash}
            reviewing={reviewingAts}
            onTargetingChange={setAtsTargeting}
            onRunReview={() => void runAtsReview({ mode: "full" })}
            onPrimaryAction={() => void handleUseAutoOptimizedVersion()}
            primaryActionLabel="Use Auto-Optimized Version"
            runReviewLabel="Rerun ATS Suggestions"
            stepLabel="ATS Resume"
            heading="Review ATS suggestions"
            body="Use the ATS suggestions when they help, or keep editing the ATS version manually. Save when the draft looks right, then approve it to turn public PDF download back on."
          />
        </div>
      ) : null}
    </main>
  );
}
