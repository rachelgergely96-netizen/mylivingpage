"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AtsReviewPanel from "@/components/ats/AtsReviewPanel";
import GuidedFlow from "@/components/create/GuidedFlow";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import { normalizeCreateFlowError, parseSseChunk } from "@/lib/create-flow";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  approveCandidateAtsResume,
  buildAtsRelevantFingerprint,
  getDefaultAtsTargeting,
  hasApprovedAtsResume,
  inheritApprovedAtsResume,
} from "@/lib/ats-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { usernameFromEmail } from "@/lib/usernames";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type {
  AtsReviewMode,
  AtsReviewSnapshot,
  AtsTargeting,
  ResumeData,
} from "@/types/resume";
import { MAX_PAGES_PER_ACCOUNT, isPremiumPlan } from "@/lib/plans";

type Step = "input" | "processing" | "review" | "success";
type InputMode = "paste" | "guided";
type ReviewViewport = "living" | "ats";
type CreateFlowFailure = {
  stage: "parse" | "review";
  message: string;
};

interface CreateDraft {
  resumeText: string;
  guidedData: Partial<ResumeData>;
  parsedData: ResumeData | null;
  selectedTheme: ThemeId;
  inputMode: InputMode;
  step: Step;
  atsTargeting: AtsTargeting;
  atsReview: AtsReviewSnapshot | null;
}

const PROGRESS_STEPS: Array<Exclude<Step, "processing">> = ["input", "review", "success"];
const LEGACY_CREATE_DRAFT_KEY = "mlp-draft-create";
const STAGES = [
  "Analyzing resume structure...",
  "Extracting experience data...",
  "Identifying skills and certifications...",
  "Structuring professional profile...",
  "Finalizing JSON output...",
];

const EMPTY_GUIDED_DATA: Partial<ResumeData> = {
  name: "",
  headline: "",
  location: "",
  email: null,
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [{ category: "General", items: [] }],
  certifications: [],
  stats: [],
};

function buildLivingPageStatus(publishedSlug: string) {
  return {
    title: "Living page live",
    body: `Your public page is live at mylivingpage.com/${publishedSlug}.`,
    tone: "border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] text-[#E8F2FF]",
  };
}

function buildAtsStatus(review: AtsReviewSnapshot | null) {
  if (!review) {
    return {
      title: "ATS review unavailable",
      body: "The living page is live. You can open the ATS editor later to rerun suggestions and finish the PDF.",
      tone: "border-[rgba(245,195,107,0.24)] bg-[rgba(245,195,107,0.08)] text-[#FDE7BA]",
      recommendedCta: "ats",
    };
  }

  if (hasApprovedAtsResume(review)) {
    return {
      title: "ATS resume ready",
      body: "Your ATS version fits one page and will be available for download from the live page.",
      tone: "border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] text-[#E8F2FF]",
      recommendedCta: "living",
    };
  }

  return {
    title: "ATS resume needs a quick pass",
    body: "We saved the ATS draft, but it still needs edits before it becomes a true one-page PDF.",
    tone: "border-[rgba(255,120,120,0.24)] bg-[rgba(255,120,120,0.08)] text-[#FFD5D5]",
    recommendedCta: "ats",
  };
}

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [reviewViewport, setReviewViewport] = useState<ReviewViewport>("living");
  const [guidedData, setGuidedData] = useState<Partial<ResumeData>>(EMPTY_GUIDED_DATA);
  const [resumeText, setResumeText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("cosmic");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  const [error, setError] = useState("");
  const [createFlowFailure, setCreateFlowFailure] = useState<CreateFlowFailure | null>(null);
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [atsTargeting, setAtsTargeting] = useState<AtsTargeting>({
    primaryTitle: "",
    titleVariants: [],
    jobDescription: "",
    lastExtractedKeywords: [],
  });
  const [atsReview, setAtsReview] = useState<AtsReviewSnapshot | null>(null);
  const [reviewingAts, setReviewingAts] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [publishedPageId, setPublishedPageId] = useState<string | null>(null);
  const atsReviewAbortRef = useRef<AbortController | null>(null);
  const atsReviewRequestIdRef = useRef(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("spark");
  const [pageCount, setPageCount] = useState<number>(0);
  const premium = isPremiumPlan(userPlan);
  const atPageLimit = pageCount >= MAX_PAGES_PER_ACCOUNT;

  const createDraftKey = currentUserId ? `mlp-draft-create-${currentUserId}` : null;
  const { pendingDraft, saveDraft, clearDraft, dismissDraft } = useLocalDraft<CreateDraft>(createDraftKey);

  const isDirty = useMemo(() => {
    if (step === "success") {
      return false;
    }

    return Boolean(
      resumeText.trim() ||
        (guidedData.name ?? "").trim() ||
        parsedData ||
        atsReview ||
        selectedTheme !== "cosmic",
    );
  }, [atsReview, guidedData.name, parsedData, resumeText, selectedTheme, step]);
  useUnsavedChanges(isDirty && step !== "processing");

  useEffect(() => {
    if (!isDirty || step === "processing" || step === "success") {
      return;
    }

    saveDraft({
      resumeText,
      guidedData,
      parsedData,
      selectedTheme,
      inputMode,
      step,
      atsTargeting,
      atsReview,
    });
  }, [
    atsReview,
    atsTargeting,
    guidedData,
    inputMode,
    isDirty,
    parsedData,
    resumeText,
    saveDraft,
    selectedTheme,
    step,
  ]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }

    const draft = pendingDraft.data;
    setResumeText(draft.resumeText ?? "");
    setGuidedData(draft.guidedData ?? EMPTY_GUIDED_DATA);
    setParsedData(draft.parsedData ?? null);
    setSelectedTheme(draft.selectedTheme ?? "cosmic");
    setInputMode(draft.inputMode ?? "paste");
    setStep(draft.step === "success" ? "input" : draft.step ?? "input");
    setAtsTargeting(
      draft.atsTargeting ?? {
        primaryTitle: "",
        titleVariants: [],
        jobDescription: "",
        lastExtractedKeywords: [],
      },
    );
    setAtsReview(draft.atsReview ?? null);
    dismissDraft();
  }, [dismissDraft, pendingDraft]);

  const trackCreateEvent = useCallback(async (eventName: string, metadata: Record<string, unknown> = {}) => {
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

  useEffect(() => {
    const fetchPlanInfo = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        setCurrentUserId(user.id);
        try {
          localStorage.removeItem(LEGACY_CREATE_DRAFT_KEY);
        } catch {
          // Ignore localStorage failures.
        }

        const [profileResponse, pagesResponse] = await Promise.all([
          supabase.from("profiles").select("plan, username").eq("id", user.id).maybeSingle(),
          supabase
            .from("pages")
            .select("id", { count: "exact", head: true })
            .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`),
        ]);

        setUserPlan(profileResponse.data?.plan ?? "spark");
        setPublicSlug(profileResponse.data?.username ?? usernameFromEmail(user.email));
        setPageCount(pagesResponse.count ?? 0);
      } catch {
        // Ignore.
      }
    };

    void fetchPlanInfo();
  }, []);

  useEffect(() => {
    return () => {
      atsReviewAbortRef.current?.abort();
    };
  }, []);

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
      const data = overrideData ?? parsedData;
      const targeting = overrideTargeting ?? atsTargeting;
      if (!data) {
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
            resumeData: data,
            rawResume: resumeText,
            targeting,
            appliedSuggestionIds: atsReview?.appliedSuggestionIds ?? [],
            mode,
          }),
        });

        if (response.status === 401) {
          router.push("/login?next=/create");
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

        const fingerprint = buildAtsRelevantFingerprint(data);
        const baseReview = inheritApprovedAtsResume(payload as AtsReviewSnapshot, atsReview);
        const finalizedReview = approveCandidateAtsResume(baseReview, fingerprint);
        setAtsTargeting(finalizedReview.targeting);
        setAtsReview(finalizedReview);
        setCreateFlowFailure((current) => (current?.stage === "review" ? null : current));
        void trackCreateEvent("ats.review.run", {
          mode,
          issues: finalizedReview.issues.length,
          fits_one_page:
            finalizedReview.approvedExportCheck?.fitsOnOnePage ??
            finalizedReview.candidateExportCheck?.fitsOnOnePage ??
            finalizedReview.exportCheck.fitsOnOnePage,
        });
        return finalizedReview;
      } catch (reviewError) {
        if (reviewError instanceof DOMException && reviewError.name === "AbortError") {
          return null;
        }

        const message = normalizeCreateFlowError("review", reviewError);
        setCreateFlowFailure({ stage: "review", message });
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
    [atsReview, atsTargeting, parsedData, resumeText, router, trackCreateEvent],
  );

  const beginReviewOutputs = useCallback(
    async (nextData: ResumeData, mode: InputMode) => {
      const nextTargeting = getDefaultAtsTargeting(nextData);
      setParsedData(nextData);
      setInputMode(mode);
      setAtsTargeting(nextTargeting);
      setAtsReview(null);
      setCreateFlowFailure(null);
      setReviewViewport("living");
      setStep("review");

      void trackCreateEvent("create.outputs_generated", {
        input_mode: mode,
      });

      void runAtsReview({
        mode: "full",
        overrideData: nextData,
        overrideTargeting: nextTargeting,
      });
    },
    [runAtsReview, trackCreateEvent],
  );

  const handleContinueManually = useCallback(() => {
    setCreateFlowFailure(null);
    setError("");
    setInputMode("guided");
  }, []);

  const startProcessing = async () => {
    setError("");
    setCreateFlowFailure(null);
    setProgress(4);
    setStage(STAGES[0]);
    setStep("processing");
    setParsedData(null);
    setAtsReview(null);

    try {
      const response = await fetch("/api/generate/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeText }),
      });

      if (response.status === 401) {
        setStep("input");
        setProgress(0);
        router.push("/login?next=/create");
        return;
      }

      if (!response.ok || !response.body) {
        const fallback = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(fallback?.error ?? "Could not start resume processing.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let nextData: ResumeData | null = null;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !isDone });
        buffer = parseSseChunk(buffer, (payload) => {
          if (payload.type === "progress") {
            setProgress(Number(payload.progress ?? progress));
            setStage(String(payload.stage ?? STAGES[0]));
            return;
          }

          if (payload.type === "error") {
            throw new Error(String(payload.message ?? "Resume processing failed."));
          }

          if (payload.type === "result") {
            nextData = payload.data as ResumeData;
          }
        });
      }

      if (!nextData) {
        throw new Error("We couldn't parse that resume right now. Continue manually or try again.");
      }

      await beginReviewOutputs(nextData, "paste");
    } catch (streamError) {
      const message = normalizeCreateFlowError("parse", streamError);
      setCreateFlowFailure({ stage: "parse", message });
      setStep("input");
      setProgress(0);
    }
  };

  const publishPage = async () => {
    if (!parsedData || publishing) {
      return;
    }

    setPublishing(true);
    setError("");

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/create");
        return;
      }

      const response = await fetch("/api/pages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsedData.name || "My Living Page",
          theme_id: selectedTheme,
          resume_data: parsedData,
          raw_resume: resumeText,
          page_config: atsReview ? { ats: atsReview } : {},
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        slug?: string;
        pageId?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Publish failed.");
      }

      const nextSlug = result?.slug ?? publicSlug ?? usernameFromEmail(user.email);
      setPublishedSlug(nextSlug);
      setPublishedPageId(result?.pageId ?? null);
      setPublicSlug(nextSlug);
      setStep("success");
      clearDraft();
      void trackCreateEvent("create.completed", {
        input_mode: inputMode,
        theme_id: selectedTheme,
        ats_ready: hasApprovedAtsResume(atsReview),
      });
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish page.");
    } finally {
      setPublishing(false);
    }
  };

  const progressStep = step === "processing" ? "review" : step;
  const currentProgressIndex = PROGRESS_STEPS.indexOf(progressStep as Exclude<Step, "processing">);
  const atsPdfReady = hasApprovedAtsResume(atsReview);
  const predictedSlug = publishedSlug || publicSlug || "your-username";
  const atsStatus = buildAtsStatus(atsReview);
  const livingPageStatus = buildLivingPageStatus(predictedSlug);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mb-5 flex items-center justify-between sm:mb-7">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Create Flow</p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl md:text-4xl">
            Build Your Living Page
          </h1>
        </div>
        <div className="hidden gap-2 md:flex">
          {PROGRESS_STEPS.map((progressId, index) => (
            <span
              key={progressId}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: currentProgressIndex >= index ? 34 : 24,
                background:
                  currentProgressIndex >= index
                    ? "linear-gradient(90deg, #3B82F6, #93C5FD)"
                    : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>
      </div>

      {error && !createFlowFailure ? (
        <p className="mb-4 rounded-xl border border-[rgba(255,120,120,0.35)] bg-[rgba(255,120,120,0.08)] px-4 py-3 text-sm text-[#ff8e8e]">
          {error}
        </p>
      ) : null}

      {pendingDraft && step === "input" ? (
        <DraftBanner savedAt={pendingDraft.savedAt} onRestore={restoreDraft} onDiscard={dismissDraft} />
      ) : null}

      {atPageLimit ? (
        <section className="glass-card rounded-2xl p-5 text-center sm:p-8">
          <p className="mb-3 text-2xl">&#x1F512;</p>
          <h2 className="font-heading text-xl font-bold text-[#F0F4FF] sm:text-2xl">Page limit reached</h2>
          <p className="mt-2 text-sm text-[rgba(240,244,255,0.55)]">
            Each account supports {MAX_PAGES_PER_ACCOUNT} public page in v1. Edit your current page, or delete it
            before creating a replacement.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-5 gold-pill px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.16em]"
          >
            Go to Dashboard
          </button>
        </section>
      ) : null}

      {!atPageLimit && step === "input" && inputMode === "paste" ? (
        <section className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 1</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
            Paste anything resume-related
          </h2>
          <p className="mt-2 text-sm text-[rgba(240,244,255,0.58)]">
            Paste your resume, LinkedIn summary, portfolio bio, brag bullets, or rough notes. We’ll turn that intake
            into both an ATS-ready resume draft and your living page.
          </p>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder={`Example:\nSenior Product Designer\nNew York, NY\nLed redesigns for onboarding and activation...\n\nOr paste the full resume you already use.`}
            className="mt-5 min-h-[260px] w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] p-4 font-mono text-xs leading-6 text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none sm:min-h-[340px] sm:rounded-2xl sm:p-5 sm:text-sm sm:leading-7"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[rgba(240,244,255,0.35)]">
            <p>
              {resumeText.length.toLocaleString()} characters · {resumeText.split(/\n/).length} lines
            </p>
            <button
              type="button"
              onClick={() => {
                setCreateFlowFailure(null);
                setInputMode("guided");
              }}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:text-[#BFDBFE]"
            >
              Enter manually instead
            </button>
          </div>

          {createFlowFailure?.stage === "parse" ? (
            <div className="mt-4 rounded-xl border border-[rgba(255,120,120,0.28)] bg-[rgba(255,120,120,0.08)] p-4">
              <p className="text-sm text-[#FFD5D5]">{createFlowFailure.message}</p>
              <button
                type="button"
                onClick={handleContinueManually}
                className="mt-4 rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                Continue manually
              </button>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!resumeText.trim()}
              onClick={startProcessing}
              className="gold-pill h-12 px-7 text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate both versions
            </button>
          </div>
        </section>
      ) : null}

      {!atPageLimit && step === "input" && inputMode === "guided" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">Manual entry</p>
              <p className="mt-2 text-sm text-[#F0F4FF]">
                Build the first version manually, then we’ll still generate the ATS draft from what you entered.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Back to paste
            </button>
          </div>
          <GuidedFlow
            guidedData={guidedData}
            onUpdate={setGuidedData}
            onComplete={(data) => {
              void beginReviewOutputs(data, "guided");
            }}
            onBack={() => setInputMode("paste")}
          />
        </section>
      ) : null}

      {step === "processing" ? (
        <section className="glass-card mx-auto max-w-xl rounded-2xl p-5 text-center sm:p-8">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-2 border-[rgba(59,130,246,0.2)] border-t-[#3B82F6]" />
          <h2 className="mt-6 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
            Building both versions
          </h2>
          <p className="mt-2 text-sm text-[#3B82F6]">{stage}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#93C5FD] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 font-mono text-xs text-[rgba(240,244,255,0.4)]">{progress}%</p>
        </section>
      ) : null}

      {step === "review" && parsedData ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 2</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
              Review both outputs
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-[rgba(240,244,255,0.6)]">
              Your living page and ATS resume are now separate. Publish the page once it looks right, and keep
              refining the ATS version later if it still needs tightening.
            </p>
          </div>

          <div className="md:hidden">
            <div className="flex gap-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-1">
              {(["living", "ats"] as ReviewViewport[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setReviewViewport(view)}
                  className="flex-1 rounded-lg px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition-all"
                  style={{
                    background: reviewViewport === view ? "rgba(59,130,246,0.12)" : "transparent",
                    color: reviewViewport === view ? "#93C5FD" : "rgba(240,244,255,0.45)",
                  }}
                >
                  {view === "living" ? "Living Page" : "ATS Resume"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className={reviewViewport === "living" ? "block" : "hidden md:block"}>
              <div className="space-y-5">
                <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Living Page</p>
                  <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                    Shape the page people will actually read
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                    Pick the visual direction here. You can edit the copy in more detail after publish.
                  </p>
                  <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Public URL</p>
                    <div className="mt-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD]">
                      mylivingpage.com/{publicSlug || "your-username"}
                    </div>
                  </div>
                </div>

                <ThemePicker
                  themes={THEME_REGISTRY}
                  selectedThemeId={selectedTheme}
                  onSelectTheme={setSelectedTheme}
                  premium={premium}
                  showDescription
                />

                <div className="overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.18)]">
                  <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.35)] px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                    <div className="ml-3 rounded-md bg-[rgba(255,255,255,0.06)] px-3 py-1 font-mono text-[11px] text-[rgba(240,244,255,0.5)]">
                      mylivingpage.com/<span className="text-[#93C5FD]">{publicSlug || "your-username"}</span>
                    </div>
                  </div>
                  <ThemeCanvas themeId={selectedTheme} height="min(620px, calc(100dvh - 220px))" className="rounded-none">
                    <div className="h-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.55)_100%)]">
                      <ResumeLayout data={parsedData} />
                    </div>
                  </ThemeCanvas>
                </div>
              </div>
            </div>

            <div className={reviewViewport === "ats" ? "block" : "hidden md:block"}>
              <AtsReviewPanel
                data={parsedData}
                review={atsReview}
                targeting={atsTargeting}
                previewResumeData={atsReview?.approvedResumeData ?? atsReview?.candidateResumeData ?? parsedData}
                previewContentHash={atsReview?.approvedContentHash ?? atsReview?.contentHash ?? null}
                reviewing={reviewingAts}
                reviewError={createFlowFailure?.stage === "review" ? createFlowFailure.message : null}
                onTargetingChange={setAtsTargeting}
                onRunReview={() => void runAtsReview({ mode: "full" })}
                runReviewLabel="Rerun ATS Suggestions"
                stepLabel="ATS Resume"
                heading="We built your ATS version"
                body={
                  atsPdfReady
                    ? "Your ATS resume is already separate from the public page. You can preview it now and revise it later if you want to tune the wording."
                    : "We saved an ATS draft from the same intake. If it still needs work, publish the living page now and tighten the ATS version later in its own editor."
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setStep("input")}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={publishPage}
              className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-60"
            >
              {publishing ? "Publishing..." : "Publish Living Page"}
            </button>
            <p className="text-xs text-[rgba(240,244,255,0.48)]">
              ATS readiness will never block publishing your living page.
            </p>
          </div>
        </section>
      ) : null}

      {step === "success" ? (
        <section className="space-y-5">
          <div className="glass-card rounded-2xl p-5 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 3</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
              Your living page is live
            </h2>
            <p className="mt-2 text-sm leading-7 text-[rgba(240,244,255,0.6)]">
              You now have a public living page plus a separate ATS resume workspace. Open either editor whenever you
              want to keep refining.
            </p>

            <div className="mt-5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Live URL</p>
              <div className="mt-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD]">
                mylivingpage.com/{predictedSlug}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className={`rounded-2xl border p-4 ${livingPageStatus.tone}`}>
                <p className="text-[10px] uppercase tracking-[0.16em]">Living Page</p>
                <h3 className="mt-2 font-heading text-xl font-semibold">{livingPageStatus.title}</h3>
                <p className="mt-2 text-sm leading-6">{livingPageStatus.body}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${atsStatus.tone}`}>
                <p className="text-[10px] uppercase tracking-[0.16em]">ATS Resume</p>
                <h3 className="mt-2 font-heading text-xl font-semibold">{atsStatus.title}</h3>
                <p className="mt-2 text-sm leading-6">{atsStatus.body}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${predictedSlug}`}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              View Live Page
            </Link>
            {publishedPageId ? (
              <Link
                href={`/dashboard/edit/${publishedPageId}?tab=living-page`}
                className={`rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
                  atsStatus.recommendedCta === "living"
                    ? "gold-pill hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)]"
                    : "border border-[rgba(255,255,255,0.15)] text-[rgba(240,244,255,0.78)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                }`}
              >
                Edit Living Page
              </Link>
            ) : null}
            {publishedPageId ? (
              <Link
                href={`/dashboard/edit/${publishedPageId}?tab=ats-resume`}
                className={`rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
                  atsStatus.recommendedCta === "ats"
                    ? "gold-pill hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)]"
                    : "border border-[rgba(255,255,255,0.15)] text-[rgba(240,244,255,0.78)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                }`}
              >
                Edit ATS Resume
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
