"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AtsReviewPanel from "@/components/ats/AtsReviewPanel";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  applyProposalSelection,
  buildAtsRelevantFingerprint,
  getDefaultAtsTargeting,
  stampProposalDecision,
} from "@/lib/ats-review";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type {
  AtsReviewMode,
  AtsTargeting,
  PageConfig,
  PageRecord,
  ResumeData,
} from "@/types/resume";
import { isPremiumPlan } from "@/lib/plans";

interface EditDraft {
  data: ResumeData;
  themeId: ThemeId;
  pageConfig: PageConfig;
}

type Tab = "content" | "optimize" | "theme" | "preview";

export default function EditPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("content");

  const [page, setPage] = useState<PageRecord | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
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
  const [applyingProposalChanges, setApplyingProposalChanges] = useState(false);
  const [openingSaveGate, setOpeningSaveGate] = useState(false);
  const [showSaveGate, setShowSaveGate] = useState(false);
  const [saveGateBusy, setSaveGateBusy] = useState(false);
  const atsReviewAbortRef = useRef<AbortController | null>(null);
  const atsReviewRequestIdRef = useRef(0);

  // Draft persistence & dirty tracking
  const { pendingDraft, saveDraft, clearDraft, dismissDraft } = useLocalDraft<EditDraft>(`mlp-draft-edit-${pageId}`);
  const initialSnapshotRef = useRef<string>("");
  const initialAtsFingerprintRef = useRef<string>("");
  const atsReview = pageConfig.ats ?? null;

  const isDirty = useMemo(() => {
    if (!data || !initialSnapshotRef.current) return false;
    const current = JSON.stringify({ data, themeId, pageConfig });
    return current !== initialSnapshotRef.current;
  }, [data, themeId, pageConfig]);
  const hasAtsRelevantChanges = useMemo(() => {
    if (!data || !initialAtsFingerprintRef.current) return false;
    return buildAtsRelevantFingerprint(data) !== initialAtsFingerprintRef.current;
  }, [data]);

  useUnsavedChanges(isDirty);

  // Save draft on changes
  useEffect(() => {
    if (!data || !isDirty) return;
    saveDraft({ data, themeId, pageConfig });
  }, [data, themeId, pageConfig, isDirty, saveDraft]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    const d = pendingDraft.data;
    setData(d.data);
    setThemeId(d.themeId);
    setPageConfig(d.pageConfig ?? {});
    setAtsTargeting(d.pageConfig?.ats?.targeting ?? getDefaultAtsTargeting(d.data));
    dismissDraft();
  }, [pendingDraft, dismissDraft]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/pages/${pageId}`);
        if (res.status === 401) { router.push("/login?next=/dashboard"); return; }
        if (!res.ok) { setError("Page not found or you don't have access."); setLoading(false); return; }
        const row = (await res.json()) as PageRecord;
        setPage(row);
        const rd = { ...row.resume_data };
        // Normalize legacy string[] skills to {category, items}[]
        if (rd.skills?.length && typeof rd.skills[0] === "string") {
          rd.skills = [{ category: "General", items: rd.skills as unknown as string[] }];
        }
        // Normalize legacy string[] certifications to {name, issuer, date}[]
        if (rd.certifications?.length && typeof rd.certifications[0] === "string") {
          rd.certifications = (rd.certifications as unknown as string[]).map((c) => ({ name: c, issuer: null, date: null }));
        }
        setData(rd);
        setPageConfig(row.page_config ?? {});
        setThemeId(row.theme_id as ThemeId);
        setPublicSlug(row.slug);
        setAtsTargeting(row.page_config?.ats?.targeting ?? getDefaultAtsTargeting(rd));
        // Set initial snapshot for dirty tracking
        initialSnapshotRef.current = JSON.stringify({ data: rd, themeId: row.theme_id, pageConfig: row.page_config ?? {} });
        initialAtsFingerprintRef.current = buildAtsRelevantFingerprint(rd);
        // Fetch user plan
        const profileRes = await fetch("/api/profile");
        if (profileRes.ok) {
          const prof = (await profileRes.json()) as { plan?: string; username?: string };
          setUserPlan(prof.plan ?? "spark");
          setPublicSlug(prof.username ?? row.slug);
        }
      } catch {
        setError("Failed to load page.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pageId, router]);

  useEffect(() => {
    return () => {
      atsReviewAbortRef.current?.abort();
    };
  }, []);

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      setData((prev) => prev ? { ...prev, avatar_url: json.url! } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    await fetch("/api/avatar", { method: "DELETE" });
    setData((prev) => prev ? { ...prev, avatar_url: null } : prev);
  };

  const updateField = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((prev) => prev ? { ...prev, [key]: value } : prev);
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

  const runAtsReview = useCallback(
    async ({
      mode = "full",
      overrideData,
      overrideTargeting,
      appliedSuggestionIds,
    }: {
      mode?: AtsReviewMode;
      overrideData?: ResumeData;
      overrideTargeting?: AtsTargeting;
      appliedSuggestionIds?: string[];
    } = {}) => {
      const nextData = overrideData ?? data;
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
            appliedSuggestionIds: appliedSuggestionIds ?? atsReview?.appliedSuggestionIds ?? [],
            mode,
          }),
        });

        if (response.status === 401) {
          router.push("/login?next=/dashboard");
          return null;
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        if (
          !response.ok ||
          !payload ||
          typeof payload !== "object" ||
          "error" in payload
        ) {
          const failure = payload as { error?: string } | null;
          throw new Error(failure?.error ?? "ATS review failed.");
        }

        const result = payload as NonNullable<PageConfig["ats"]>;
        if (requestId !== atsReviewRequestIdRef.current) {
          return null;
        }

        setAtsTargeting(result.targeting);
        setPageConfig((prev) => ({ ...prev, ats: result }));
        void trackOptimizeEvent("ats.review.run", {
          mode,
          page_id: page?.id,
          issues: result.issues.length,
          fits_one_page: result.exportCheck.fitsOnOnePage,
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
    [atsReview?.appliedSuggestionIds, atsTargeting, data, page?.id, page?.raw_resume, router, trackOptimizeEvent],
  );

  const persistPage = useCallback(
    async (nextData: ResumeData, nextPageConfig: PageConfig, nextThemeId = themeId) => {
      if (!page || saving) return false;

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
        const saveRes = await fetch(`/api/pages/${page.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!saveRes.ok) {
          const body = (await saveRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Save failed.");
        }

        setData(nextData);
        setPageConfig(nextPageConfig);
        setThemeId(nextThemeId);
        clearDraft();
        initialSnapshotRef.current = JSON.stringify({ data: nextData, themeId: nextThemeId, pageConfig: nextPageConfig });
        initialAtsFingerprintRef.current = buildAtsRelevantFingerprint(nextData);
        setSuccess("Saved successfully!");
        setTimeout(() => setSuccess(""), 3000);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to save.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [clearDraft, page, saving, themeId],
  );

  const applyProposalDecisionToLocalState = useCallback(
    async (decision: NonNullable<PageConfig["ats"]>["proposalDecision"]) => {
      if (!data || !atsReview) {
        return {
          nextData: data,
          nextReview: atsReview,
        };
      }

      const decisionWithTimestamp = {
        ...decision,
        lastDecisionAt: new Date().toISOString(),
      };
      const nextData = applyProposalSelection(data, atsReview.proposals, decision.acceptedProposalIds);

      if (decision.acceptedProposalIds.length) {
        const fastReview = await runAtsReview({
          mode: "fast",
          overrideData: nextData,
          overrideTargeting: atsTargeting,
          appliedSuggestionIds: decision.acceptedProposalIds,
        });
        if (fastReview) {
          const stampedReview = stampProposalDecision(fastReview, decisionWithTimestamp);
          setData(nextData);
          setPageConfig((current) => ({ ...current, ats: stampedReview }));
          return {
            nextData,
            nextReview: stampedReview,
          };
        }
      }

      const stampedReview = stampProposalDecision(atsReview, decisionWithTimestamp);
      setData(nextData);
      setPageConfig((current) => ({ ...current, ats: stampedReview }));
      return {
        nextData,
        nextReview: stampedReview,
      };
    },
    [atsReview, atsTargeting, data, runAtsReview],
  );

  const handleOptimizeApply = useCallback(
    async (decision: NonNullable<PageConfig["ats"]>["proposalDecision"]) => {
      if (!data || !atsReview) {
        return;
      }

      setApplyingProposalChanges(true);
      if (decision.acceptedProposalIds.length) {
        void trackOptimizeEvent("ats.proposal.accepted", {
          page_id: page?.id,
          accepted_count: decision.acceptedProposalIds.length,
        });
      }
      if (decision.declinedProposalIds.length) {
        void trackOptimizeEvent("ats.proposal.declined", {
          page_id: page?.id,
          declined_count: decision.declinedProposalIds.length,
        });
      }

      await applyProposalDecisionToLocalState(decision);
      setSuccess(
        decision.acceptedProposalIds.length
          ? "ATS-ready edits applied locally. Save when you're ready."
          : "You kept your current wording. Save when you're ready.",
      );
      setTimeout(() => setSuccess(""), 3000);
      setApplyingProposalChanges(false);
    },
    [applyProposalDecisionToLocalState, atsReview, data, page?.id, trackOptimizeEvent],
  );

  const handleOptimizeKeepCurrent = useCallback(
    async (decision: NonNullable<PageConfig["ats"]>["proposalDecision"]) => {
      if (!atsReview) {
        return;
      }

      const decisionWithTimestamp = {
        ...decision,
        lastDecisionAt: new Date().toISOString(),
      };
      if (decision.declinedProposalIds.length) {
        void trackOptimizeEvent("ats.proposal.declined", {
          page_id: page?.id,
          declined_count: decision.declinedProposalIds.length,
        });
      }
      setPageConfig((current) => ({ ...current, ats: stampProposalDecision(atsReview, decisionWithTimestamp) }));
      setSuccess("You kept your current wording. Save when you're ready.");
      setTimeout(() => setSuccess(""), 3000);
    },
    [atsReview, page?.id, trackOptimizeEvent],
  );

  const handleSaveClick = useCallback(async () => {
    if (!data || !page || saving || openingSaveGate || saveGateBusy) return;

    if (!hasAtsRelevantChanges) {
      if (isDirty) {
        void trackOptimizeEvent("ats.save_gate.skipped_non_ats", {
          page_id: page.id,
        });
      }
      await persistPage(data, pageConfig, themeId);
      return;
    }

    setOpeningSaveGate(true);
    setError("");
    setSuccess("");
    const result = await runAtsReview({
      mode: "full",
      overrideData: data,
      overrideTargeting: atsTargeting,
      appliedSuggestionIds: [],
    });
    setOpeningSaveGate(false);

    if (!result) {
      return;
    }

    if (result.proposals.length === 0) {
      await persistPage(
        data,
        {
          ...pageConfig,
          ats: stampProposalDecision(result, {
            acceptedProposalIds: [],
            declinedProposalIds: [],
            lastDecisionAt: new Date().toISOString(),
          }),
        },
        themeId,
      );
      return;
    }

    void trackOptimizeEvent("ats.save_gate.opened", {
      page_id: page.id,
      proposal_count: result.proposals.length,
    });
    setShowSaveGate(true);
  }, [
    atsTargeting,
    data,
    hasAtsRelevantChanges,
    isDirty,
    openingSaveGate,
    page,
    pageConfig,
    persistPage,
    runAtsReview,
    saveGateBusy,
    saving,
    themeId,
    trackOptimizeEvent,
  ]);

  const handleSaveWithSelectedAtsChanges = useCallback(
    async (decision: NonNullable<PageConfig["ats"]>["proposalDecision"]) => {
      if (!data || !page) {
        return;
      }

      setSaveGateBusy(true);
      if (decision.acceptedProposalIds.length) {
        void trackOptimizeEvent("ats.proposal.accepted", {
          page_id: page.id,
          accepted_count: decision.acceptedProposalIds.length,
        });
      }
      if (decision.declinedProposalIds.length) {
        void trackOptimizeEvent("ats.proposal.declined", {
          page_id: page.id,
          declined_count: decision.declinedProposalIds.length,
        });
      }

      const nextState = await applyProposalDecisionToLocalState(decision);
      const saved = nextState.nextData && nextState.nextReview
        ? await persistPage(nextState.nextData, { ...pageConfig, ats: nextState.nextReview }, themeId)
        : false;

      if (saved) {
        setShowSaveGate(false);
      }
      setSaveGateBusy(false);
    },
    [applyProposalDecisionToLocalState, data, page, pageConfig, persistPage, themeId, trackOptimizeEvent],
  );

  const handleSaveWithoutAtsEdits = useCallback(
    async (decision: NonNullable<PageConfig["ats"]>["proposalDecision"]) => {
      if (!data || !atsReview) {
        return;
      }

      setSaveGateBusy(true);
      const decisionWithTimestamp = {
        ...decision,
        lastDecisionAt: new Date().toISOString(),
      };
      if (decision.declinedProposalIds.length) {
        void trackOptimizeEvent("ats.proposal.declined", {
          page_id: page?.id,
          declined_count: decision.declinedProposalIds.length,
        });
      }
      const saved = await persistPage(
        data,
        {
          ...pageConfig,
          ats: stampProposalDecision(atsReview, decisionWithTimestamp),
        },
        themeId,
      );
      if (saved) {
        setShowSaveGate(false);
      }
      setSaveGateBusy(false);
    },
    [atsReview, data, page?.id, pageConfig, persistPage, themeId, trackOptimizeEvent],
  );

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 md:px-10">
        <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[rgba(59,130,246,0.2)] border-t-[#3B82F6]" />
          <p className="mt-4 text-sm text-[rgba(240,244,255,0.5)]">Loading page...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 md:px-10">
        <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-sm text-[#ff8e8e]">{error || "Page not found."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 md:px-10">
      {/* Header */}
      <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Edit Page</p>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#F0F4FF]">{data.name}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 sm:px-5 sm:py-2.5 text-xs uppercase tracking-[0.14em] text-[rgba(240,244,255,0.6)] hover:text-[#93C5FD]"
          >
            Back
          </button>
          <button
            type="button"
            disabled={saving || openingSaveGate || saveGateBusy}
            onClick={() => void handleSaveClick()}
            className="gold-pill px-5 py-2 sm:px-6 sm:py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-60"
          >
            {saving ? "Saving..." : openingSaveGate ? "Reviewing ATS..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[rgba(255,120,120,0.35)] bg-[rgba(255,120,120,0.08)] px-4 py-3 text-sm text-[#ff8e8e]">{error}</p> : null}
      {success ? <p className="mb-4 rounded-xl border border-[rgba(100,220,100,0.35)] bg-[rgba(100,220,100,0.08)] px-4 py-3 text-sm text-[#88ee88]">{success}</p> : null}

      {pendingDraft ? (
        <DraftBanner savedAt={pendingDraft.savedAt} onRestore={restoreDraft} onDiscard={dismissDraft} />
      ) : null}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-1">
        {(["content", "optimize", "theme", "preview"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] transition-all"
            style={{
              background: tab === t ? "rgba(59,130,246,0.12)" : "transparent",
              color: tab === t ? "#93C5FD" : "rgba(240,244,255,0.45)",
              borderColor: tab === t ? "rgba(59,130,246,0.25)" : "transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "optimize" ? (
        <AtsReviewPanel
          data={data}
          review={atsReview}
          targeting={atsTargeting}
          reviewing={reviewingAts}
          actionBusy={applyingProposalChanges}
          onTargetingChange={setAtsTargeting}
          onRunReview={() => void runAtsReview({ mode: "full" })}
          onPrimaryAction={(decision) => void handleOptimizeApply(decision)}
          onSecondaryAction={(decision) => void handleOptimizeKeepCurrent(decision)}
          primaryActionLabel="Apply Selected Changes"
          secondaryActionLabel="Keep Current Version"
          runReviewLabel="Run Full ATS Review"
          stepLabel="Optimize"
          heading="Review the ATS-ready before and after"
          body="See the proposed ATS-safe edits section by section, apply the ones you want, and keep the full diagnostics tucked under Details."
        />
      ) : null}

      {/* Content Tab */}
      {tab === "content" ? (
        <div className="space-y-5">
          {/* Public URL */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Public URL</legend>
            <div className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD]">
              mylivingpage.com/{publicSlug || page?.slug || "your-username"}
            </div>
            <p className="text-xs text-[rgba(240,244,255,0.42)]">
              Change this in account settings. Editing this page does not change your public URL.
            </p>
          </fieldset>

          {/* Basic Info */}
          <fieldset className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Basic Info</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Name</span>
                <input type="text" value={data.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Headline</span>
                <input type="text" value={data.headline} onChange={(e) => updateField("headline", e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Location</span>
                <input type="text" value={data.location} onChange={(e) => updateField("location", e.target.value)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Email</span>
                <input type="email" value={data.email ?? ""} onChange={(e) => updateField("email", e.target.value || null)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">LinkedIn</span>
                <input type="text" value={data.linkedin ?? ""} onChange={(e) => updateField("linkedin", e.target.value || null)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">GitHub</span>
                <input type="text" value={data.github ?? ""} onChange={(e) => updateField("github", e.target.value || null)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.4)]">Website</span>
                <input type="text" value={data.website ?? ""} onChange={(e) => updateField("website", e.target.value || null)} className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
              </label>
            </div>
          </fieldset>

          {/* Profile Photo */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Profile Photo</legend>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
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
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#E8845C] font-heading text-xl sm:text-2xl font-bold text-[#0a1628] shadow-[0_0_28px_rgba(59,130,246,0.3)]">
                  {(data.name || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    e.target.value = "";
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
                  <button type="button" onClick={removeAvatar} className="text-xs text-[rgba(240,244,255,0.35)] hover:text-[#ff8e8e]">
                    Remove &middot; use monogram
                  </button>
                ) : (
                  <p className="text-[10px] text-[rgba(240,244,255,0.3)]">Optional &middot; JPEG, PNG, or WebP under 2 MB</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Summary */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Summary</legend>
            <textarea
              value={data.summary}
              onChange={(e) => updateField("summary", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm leading-6 text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
            />
          </fieldset>

          {/* Stats */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Stats</legend>
            {data.stats?.map((stat, i) => (
              <div key={i} className="flex gap-3">
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => {
                    const next = [...(data.stats ?? [])];
                    next[i] = { ...next[i], value: e.target.value };
                    updateField("stats", next);
                  }}
                  placeholder="Value"
                  className="w-28 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD] focus:border-[#3B82F6] focus:outline-none"
                />
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => {
                    const next = [...(data.stats ?? [])];
                    next[i] = { ...next[i], label: e.target.value };
                    updateField("stats", next);
                  }}
                  placeholder="Label"
                  className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateField("stats", (data.stats ?? []).filter((_, idx) => idx !== i))}
                  className="rounded-lg border border-[rgba(255,120,120,0.2)] px-3 py-2 text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]"
                >
                  Remove
                </button>
              </div>
            ))}
            {(data.stats?.length ?? 0) < 4 ? (
              <button
                type="button"
                onClick={() => updateField("stats", [...(data.stats ?? []), { value: "", label: "" }])}
                className="rounded-full border border-dashed border-[rgba(59,130,246,0.3)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#93C5FD] transition-all"
              >
                + Add Stat
              </button>
            ) : null}
          </fieldset>

          {/* Experience */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Experience</legend>
            {data.experience?.map((exp, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                  <input type="text" value={exp.title} onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], title: e.target.value }; updateField("experience", next); }} placeholder="Title" className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                  <input type="text" value={exp.company} onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], company: e.target.value }; updateField("experience", next); }} placeholder="Company" className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                  <input type="text" value={exp.dates} onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], dates: e.target.value }; updateField("experience", next); }} placeholder="Dates" className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                </div>
                <input type="text" value={exp.url ?? ""} onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], url: e.target.value || null }; updateField("experience", next); }} placeholder="Company website URL (optional)" className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <textarea
                  value={exp.highlights?.join("\n") ?? ""}
                  onChange={(e) => { const next = [...data.experience]; next[i] = { ...next[i], highlights: e.target.value.split("\n").filter(Boolean) }; updateField("experience", next); }}
                  rows={2}
                  placeholder="Highlights (one per line)"
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs leading-5 text-[rgba(240,244,255,0.6)] focus:border-[#3B82F6] focus:outline-none"
                />
                <button type="button" onClick={() => updateField("experience", data.experience.filter((_, idx) => idx !== i))} className="text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]">
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("experience", [...(data.experience ?? []), { title: "", company: "", dates: "", highlights: [], url: null }])}
              className="rounded-full border border-dashed border-[rgba(59,130,246,0.3)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#93C5FD] transition-all"
            >
              + Add Experience
            </button>
          </fieldset>

          {/* Education */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Education</legend>
            {data.education?.map((edu, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input type="text" value={edu.degree} onChange={(e) => { const next = [...data.education]; next[i] = { ...next[i], degree: e.target.value }; updateField("education", next); }} placeholder="Degree" className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <input type="text" value={edu.school} onChange={(e) => { const next = [...data.education]; next[i] = { ...next[i], school: e.target.value }; updateField("education", next); }} placeholder="School" className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <input type="text" value={edu.year} onChange={(e) => { const next = [...data.education]; next[i] = { ...next[i], year: e.target.value }; updateField("education", next); }} placeholder="Year" className="w-24 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <button type="button" onClick={() => updateField("education", data.education.filter((_, idx) => idx !== i))} className="rounded-lg border border-[rgba(255,120,120,0.2)] px-3 py-2 text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => updateField("education", [...(data.education ?? []), { degree: "", school: "", year: "" }])} className="rounded-full border border-dashed border-[rgba(59,130,246,0.3)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#93C5FD] transition-all">+ Add Education</button>
          </fieldset>

          {/* Skills */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Skills</legend>
            {data.skills?.map((group, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                <input
                  type="text"
                  value={typeof group === "string" ? group : group.category}
                  onChange={(e) => { const next = [...(data.skills ?? [])]; next[i] = { ...next[i], category: e.target.value }; updateField("skills", next); }}
                  placeholder="Category (e.g. Languages, Tools)"
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
                />
                <input
                  type="text"
                  value={Array.isArray((group as { items?: string[] }).items) ? (group as { items: string[] }).items.join(", ") : ""}
                  onChange={(e) => { const next = [...(data.skills ?? [])]; next[i] = { ...next[i], items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }; updateField("skills", next); }}
                  placeholder="TypeScript, React, Node.js (comma separated)"
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none"
                />
                <button type="button" onClick={() => updateField("skills", (data.skills ?? []).filter((_, idx) => idx !== i))} className="text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => updateField("skills", [...(data.skills ?? []), { category: "", items: [] }])} className="rounded-full border border-dashed border-[rgba(59,130,246,0.3)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#93C5FD] transition-all">+ Add Skill Category</button>
          </fieldset>

          {/* Projects */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Projects</legend>
            {data.projects?.map((proj, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                <input type="text" value={proj.name} onChange={(e) => { const next = [...data.projects]; next[i] = { ...next[i], name: e.target.value }; updateField("projects", next); }} placeholder="Project Name" className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <textarea value={proj.description} onChange={(e) => { const next = [...data.projects]; next[i] = { ...next[i], description: e.target.value }; updateField("projects", next); }} rows={2} placeholder="Brief description" className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs leading-5 text-[rgba(240,244,255,0.6)] focus:border-[#3B82F6] focus:outline-none" />
                <input type="text" value={proj.tech?.join(", ") ?? ""} onChange={(e) => { const next = [...data.projects]; next[i] = { ...next[i], tech: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }; updateField("projects", next); }} placeholder="Technologies (comma separated)" className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <input type="text" value={proj.url ?? ""} onChange={(e) => { const next = [...data.projects]; next[i] = { ...next[i], url: e.target.value || null }; updateField("projects", next); }} placeholder="Project URL (optional)" className="w-full rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <button type="button" onClick={() => updateField("projects", data.projects.filter((_, idx) => idx !== i))} className="text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => updateField("projects", [...(data.projects ?? []), { name: "", description: "", tech: [], url: null }])} className="rounded-full border border-dashed border-[rgba(59,130,246,0.3)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#93C5FD] transition-all">+ Add Project</button>
          </fieldset>

          {/* Certifications */}
          <fieldset className="glass-card space-y-3 rounded-2xl p-4 sm:p-5">
            <legend className="text-[10px] uppercase tracking-[0.24em] text-[#3B82F6]">Certifications</legend>
            {data.certifications?.map((cert, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input type="text" value={cert.name} onChange={(e) => { const next = [...data.certifications]; next[i] = { ...next[i], name: e.target.value }; updateField("certifications", next); }} placeholder="Certification name" className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <input type="text" value={cert.issuer ?? ""} onChange={(e) => { const next = [...data.certifications]; next[i] = { ...next[i], issuer: e.target.value || null }; updateField("certifications", next); }} placeholder="Issuer" className="flex-1 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <input type="text" value={cert.date ?? ""} onChange={(e) => { const next = [...data.certifications]; next[i] = { ...next[i], date: e.target.value || null }; updateField("certifications", next); }} placeholder="Date" className="w-24 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#F0F4FF] focus:border-[#3B82F6] focus:outline-none" />
                <button type="button" onClick={() => updateField("certifications", data.certifications.filter((_, idx) => idx !== i))} className="rounded-lg border border-[rgba(255,120,120,0.2)] px-3 py-2 text-xs text-[rgba(255,120,120,0.6)] hover:text-[#ff8e8e]">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => updateField("certifications", [...(data.certifications ?? []), { name: "", issuer: null, date: null }])} className="rounded-full border border-dashed border-[rgba(59,130,246,0.3)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#3B82F6] hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#93C5FD] transition-all">+ Add Certification</button>
          </fieldset>
        </div>
      ) : null}

      {/* Theme Tab */}
      {tab === "theme" ? (
        <ThemePicker
          themes={THEME_REGISTRY}
          selectedThemeId={themeId}
          onSelectTheme={setThemeId}
          premium={premium}
        />
      ) : null}

      {/* Preview Tab */}
      {tab === "preview" ? (
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
      ) : null}

      {showSaveGate && data ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,22,40,0.96)] p-4 shadow-[0_32px_120px_rgba(0,0,0,0.45)] sm:p-6">
            <AtsReviewPanel
              data={data}
              review={atsReview}
              targeting={atsTargeting}
              reviewing={reviewingAts}
              actionBusy={saveGateBusy}
              onTargetingChange={setAtsTargeting}
              onRunReview={() => void runAtsReview({ mode: "full" })}
              onBack={() => setShowSaveGate(false)}
              onPrimaryAction={(decision) => void handleSaveWithSelectedAtsChanges(decision)}
              onSecondaryAction={(decision) => void handleSaveWithoutAtsEdits(decision)}
              primaryActionLabel="Save With Selected ATS Edits"
              secondaryActionLabel="Save Without ATS Edits"
              backLabel="Cancel"
              runReviewLabel="Run Full ATS Review"
              stepLabel="Save Review"
              heading="Review ATS-ready edits before saving"
              body="We found content changes that affect recruiter search or one-page ATS export. Accept or decline the proposed edits before this save goes through."
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
