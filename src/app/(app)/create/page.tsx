"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GuidedFlow from "@/components/create/GuidedFlow";
import FirstViewActivationHub from "@/components/create/FirstViewActivationHub";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import { getAccountAccessState } from "@/lib/account-access";
import { normalizeCreateFlowError, parseSseChunk } from "@/lib/create-flow";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { usernameFromEmail } from "@/lib/usernames";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type { ResumeData } from "@/types/resume";
import { MAX_PAGES_PER_ACCOUNT } from "@/lib/plans";

type Step = "input" | "processing" | "review" | "success";
type InputMode = "paste" | "guided";
type CreateFlowFailure = {
  stage: "parse";
  message: string;
  code: string | null;
  retryable: boolean;
};

interface CreateDraft {
  resumeText: string;
  guidedData: Partial<ResumeData>;
  parsedData: ResumeData | null;
  selectedTheme: ThemeId;
  inputMode: InputMode;
  step: Step;
}

const PROGRESS_STEPS: Array<Exclude<Step, "processing">> = ["input", "review", "success"];
const LEGACY_CREATE_DRAFT_KEY = "mlp-draft-create";
const STAGES = [
  "Reading your information...",
  "Structuring your experience...",
  "Building your first page...",
  "Finalizing your preview...",
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

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [guidedData, setGuidedData] = useState<Partial<ResumeData>>(EMPTY_GUIDED_DATA);
  const [resumeText, setResumeText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("cosmic");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  const [error, setError] = useState("");
  const [createFlowFailure, setCreateFlowFailure] = useState<CreateFlowFailure | null>(null);
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [publishedPageId, setPublishedPageId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accountAccess, setAccountAccess] = useState(() =>
    getAccountAccessState({ plan: "spark" }),
  );
  const [pageCount, setPageCount] = useState<number>(0);
  const featuresUnlocked = accountAccess.featuresUnlocked;
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
        selectedTheme !== "cosmic",
    );
  }, [guidedData.name, parsedData, resumeText, selectedTheme, step]);

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
    });
  }, [guidedData, inputMode, isDirty, parsedData, resumeText, saveDraft, selectedTheme, step]);

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
    setCreateFlowFailure(null);
    setError("");
    dismissDraft();
  }, [dismissDraft, pendingDraft]);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_CREATE_DRAFT_KEY);
    } catch {
      // Ignore localStorage access issues.
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

        const [profileResponse, pagesResponse] = await Promise.all([
          fetchProfileWithHostingAccess<{
            plan?: string | null;
            username?: string | null;
          }>({
            supabase,
            select: "plan, username",
            matchField: "id",
            matchValue: user.id,
          }),
          supabase
            .from("pages")
            .select("id", { count: "exact", head: true })
            .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`),
        ]);

        setAccountAccess(
          getAccountAccessState({
            plan: profileResponse.data?.plan ?? "spark",
            billing_cohort: profileResponse.data?.billing_cohort ?? null,
            hosting_trial_started_at:
              profileResponse.data?.hosting_trial_started_at ?? null,
          }),
        );
        setPublicSlug(profileResponse.data?.username ?? usernameFromEmail(user.email));
        setPageCount(pagesResponse.count ?? 0);
      } catch {
        // Ignore profile-loading failures and keep defaults.
      }
    };

    void fetchPlanInfo();
  }, []);

  const beginReviewOutputs = useCallback(
    async (nextData: ResumeData, mode: InputMode) => {
      setParsedData(nextData);
      setInputMode(mode);
      setCreateFlowFailure(null);
      setError("");
      setStep("review");
    },
    [],
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
        const fallback = (await response.json().catch(() => null)) as
          | { error?: string; code?: string; retryable?: boolean }
          | null;
        throw fallback ?? new Error("Could not start processing your information.");
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
            throw payload;
          }

          if (payload.type === "result") {
            nextData = payload.data as ResumeData;
          }
        });
      }

      if (!nextData) {
        throw new Error("We couldn't build your page from that input right now. Continue manually or try again.");
      }

      await beginReviewOutputs(nextData, "paste");
    } catch (streamError) {
      const failure = normalizeCreateFlowError(streamError);
      setCreateFlowFailure({ stage: "parse", ...failure });
      setStep("input");
      setProgress(0);
    }
  };

  const handleRetryParse = () => {
    void startProcessing();
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
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        slug?: string;
        pageId?: string;
        error?: string;
        code?: string;
        redirectTo?: string;
      } | null;

      if (!response.ok) {
        if (response.status === 402 && result?.code === "subscription_required") {
          router.push(result.redirectTo ?? "/dashboard/settings");
          return;
        }
        throw new Error(result?.error ?? "Publish failed.");
      }

      const nextSlug = result?.slug ?? publicSlug ?? usernameFromEmail(user.email);
      setPublishedSlug(nextSlug);
      setPublishedPageId(result?.pageId ?? null);
      setPublicSlug(nextSlug);
      setStep("success");
      clearDraft();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish page.");
    } finally {
      setPublishing(false);
    }
  };

  const progressStep = step === "processing" ? "review" : step;
  const currentProgressIndex = PROGRESS_STEPS.indexOf(progressStep as Exclude<Step, "processing">);
  const predictedSlug = publishedSlug || publicSlug || "your-username";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mb-5 flex items-center justify-between sm:mb-7">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Create your page</p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl md:text-4xl">
            Build your page - send it - know when they open it
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
            Go to Your Page
          </button>
        </section>
      ) : null}

      {!atPageLimit && step === "input" && inputMode === "paste" ? (
        <section className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 1</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
            Add your info
          </h2>
          <p className="mt-2 text-sm text-[rgba(240,244,255,0.58)]">
            Paste your resume or add the basics. You can clean it up later.
          </p>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste your info here..."
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
              <div className="mt-4 flex flex-wrap gap-3">
                {createFlowFailure.retryable ? (
                  <button
                    type="button"
                    onClick={handleRetryParse}
                    className="rounded-full border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE]"
                  >
                    Try again
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleContinueManually}
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  Continue manually
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!resumeText.trim()}
              onClick={startProcessing}
              className="gold-pill h-12 px-7 text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create my page
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
                Add the basics section by section, then preview the page before you send it.
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
            Building your page
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
              This is what someone will see when you send it.
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-[rgba(240,244,255,0.6)]">
              Your information is ready as a page. Publish it when it looks right, and the live page will also include a downloadable Resume PDF built from the same saved content.
            </p>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Preview</p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                This is what someone will see when you send it
              </h3>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                Keep the preview and publish controls here so the flow stays simple.
              </p>
              <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Your link</p>
                <div className="mt-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD]">
                  mylivingpage.com/{publicSlug || "your-username"}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">Publish</p>
                  <p className="mt-2 text-sm leading-6 text-[#E8F2FF]">
                    {accountAccess.isLegacyAccount
                      ? "Your page goes live and turns on Resume PDF download from the public page."
                      : "Your page goes live, turns on Resume PDF download, and starts your one month of free hosting."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(232,242,255,0.78)]">
                    When someone opens this, you&apos;ll know.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
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
                    {publishing ? "Publishing..." : "Publish Page"}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.18)]">
              <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.35)] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <div className="ml-3 rounded-md bg-[rgba(255,255,255,0.06)] px-3 py-1 font-mono text-[11px] text-[rgba(240,244,255,0.5)]">
                  mylivingpage.com/<span className="text-[#93C5FD]">{publicSlug || "your-username"}</span>
                </div>
              </div>
              <ThemeCanvas themeId={selectedTheme} height="min(540px, calc(100dvh - 280px))" className="rounded-none">
                <div className="h-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.55)_100%)]">
                  <ResumeLayout data={parsedData} />
                </div>
              </ThemeCanvas>
            </div>
          </div>

          <section data-testid="create-theme-section" className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#3B82F6]">Theme</p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">Make it feel like you</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.58)]">
                Pick a clean style. Don&apos;t overthink it.
              </p>
            </div>
            <ThemePicker
              themes={THEME_REGISTRY}
              selectedThemeId={selectedTheme}
              onSelectTheme={setSelectedTheme}
              premium={featuresUnlocked}
              showDescription
            />
          </section>
        </section>
      ) : null}

      {step === "success" ? (
        <section className="space-y-5">
          <div className="glass-card rounded-2xl p-5 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 3</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
              Your page is live.
            </h2>
            <p className="mt-2 text-sm leading-7 text-[rgba(240,244,255,0.6)]">
              {accountAccess.isLegacyAccount
                ? "This is what you'll send instead of a PDF."
                : "This is what you'll send instead of a PDF. Your first month of live hosting is now active."}
            </p>

            <div className="mt-5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Your link</p>
              <div className="mt-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD]">
                mylivingpage.com/{predictedSlug}
              </div>
              <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.62)]">
                When someone opens this, you&apos;ll know.
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] p-4 text-[#E8F2FF]">
                <p className="text-[10px] uppercase tracking-[0.16em]">Page</p>
                <h3 className="mt-2 font-heading text-xl font-semibold">Live now</h3>
                <p className="mt-2 text-sm leading-6">
                  Your public page is live at mylivingpage.com/{predictedSlug}.
                </p>
              </div>
              <div className="rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] p-4 text-[#E8F2FF]">
                <p className="text-[10px] uppercase tracking-[0.16em]">Resume PDF</p>
                <h3 className="mt-2 font-heading text-xl font-semibold">Ready from the live page</h3>
                <p className="mt-2 text-sm leading-6">
                  Anyone viewing your page can download the Resume PDF directly from the same saved content.
                </p>
              </div>
            </div>
          </div>

          {publishedPageId ? (
            <FirstViewActivationHub
              pageId={publishedPageId}
              livePath={`/${predictedSlug}`}
              analyticsHref={`/dashboard/analytics/${publishedPageId}`}
            />
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${predictedSlug}`}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Open Your Page
            </Link>
            {publishedPageId ? (
              <>
                <Link
                  href={`/dashboard/analytics/${publishedPageId}`}
                  className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                >
                  Open Page Analytics
                </Link>
                <Link
                  href={`/dashboard/edit/${publishedPageId}/living-page`}
                  className="gold-pill px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)]"
                >
                  Edit Page
                </Link>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
