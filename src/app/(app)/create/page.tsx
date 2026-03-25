"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DecisionReadinessCard from "@/components/create/DecisionReadinessCard";
import GuidedFlow from "@/components/create/GuidedFlow";
import FirstViewActivationHub from "@/components/create/FirstViewActivationHub";
import JobSeekerStarterKit from "@/components/create/JobSeekerStarterKit";
import VariantPlanner from "@/components/create/VariantPlanner";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import {
  PUBLISH_CC_TRIAL_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";
import { PRO_PLAN_PRICE, STARTER_PLAN_PRICE } from "@/lib/billing";
import { normalizeCreateFlowError, parseSseChunk } from "@/lib/create-flow";
import { buildDecisionReadinessState } from "@/lib/decision-readiness";
import {
  buildStarterVariant,
  describeJobSeekerProfile,
  normalizeStructuredResumeData,
} from "@/lib/job-seeker-starter";
import { fetchProfileWithHostingAccess } from "@/lib/profile-access";
import { applyPageVariant, sanitizePageVariants } from "@/lib/page-variants";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { usernameFromEmail } from "@/lib/usernames";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type { JobSeekerProfile, PageVariant, ResumeData } from "@/types/resume";
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
  variants: PageVariant[];
  selectedPreviewVariantId: string | null;
  jobSeekerProfile: JobSeekerProfile;
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
  proofs: [],
  testimonials: [],
};

const DEFAULT_JOB_SEEKER_PROFILE: JobSeekerProfile = {
  role_track: "engineering",
  primary_goal: "land_interviews",
  target_audience: "recruiter",
};

function formatFriendlyDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [variants, setVariants] = useState<PageVariant[]>([]);
  const [selectedPreviewVariantId, setSelectedPreviewVariantId] = useState<string | null>(null);
  const [jobSeekerProfile, setJobSeekerProfile] = useState<JobSeekerProfile>(
    DEFAULT_JOB_SEEKER_PROFILE,
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accountAccess, setAccountAccess] = useState(() =>
    getAccountAccessState({
      plan: "spark",
      billing_cohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
    }),
  );
  const [billingLoadingPlan, setBillingLoadingPlan] = useState<"starter" | "pro" | null>(null);
  const [showPublishPlanModal, setShowPublishPlanModal] = useState(false);
  const [autoPublishAfterCheckout, setAutoPublishAfterCheckout] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);
  const atPageLimit = pageCount >= MAX_PAGES_PER_ACCOUNT;
  const checkoutReturnHandledRef = useRef(false);
  const publishingRef = useRef(false);
  const returnedFromPublishCheckout =
    searchParams.get("checkout") === "success" &&
    searchParams.get("source") === "publish";

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
        variants.length > 0 ||
        selectedTheme !== "cosmic" ||
        JSON.stringify(jobSeekerProfile) !== JSON.stringify(DEFAULT_JOB_SEEKER_PROFILE),
    );
  }, [guidedData.name, jobSeekerProfile, parsedData, resumeText, selectedTheme, step, variants.length]);

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
      variants,
      selectedPreviewVariantId,
      jobSeekerProfile,
    });
  }, [
    guidedData,
    inputMode,
    isDirty,
    jobSeekerProfile,
    parsedData,
    resumeText,
    saveDraft,
    selectedPreviewVariantId,
    selectedTheme,
    step,
    variants,
  ]);

  const applyDraft = useCallback((draft: CreateDraft) => {
    setResumeText(draft.resumeText ?? "");
    setGuidedData(draft.guidedData ?? EMPTY_GUIDED_DATA);
    setParsedData(draft.parsedData ?? null);
    setSelectedTheme(draft.selectedTheme ?? "cosmic");
    setInputMode(draft.inputMode ?? "paste");
    setStep(draft.step === "success" ? "input" : draft.step ?? "input");
    setVariants(draft.variants ?? []);
    setSelectedPreviewVariantId(draft.selectedPreviewVariantId ?? null);
    setJobSeekerProfile(draft.jobSeekerProfile ?? DEFAULT_JOB_SEEKER_PROFILE);
    setCreateFlowFailure(null);
    setError("");
  }, []);

  const persistCurrentDraft = useCallback(() => {
    saveDraft({
      resumeText,
      guidedData,
      parsedData,
      selectedTheme,
      inputMode,
      step,
      variants,
      selectedPreviewVariantId,
      jobSeekerProfile,
    });
  }, [
    guidedData,
    inputMode,
    jobSeekerProfile,
    parsedData,
    resumeText,
    saveDraft,
    selectedPreviewVariantId,
    selectedTheme,
    step,
    variants,
  ]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }

    applyDraft(pendingDraft.data);
    dismissDraft();
  }, [applyDraft, dismissDraft, pendingDraft]);

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
            stripe_subscription_status?: string | null;
            stripe_trial_ends_at?: string | null;
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
            stripe_subscription_status:
              profileResponse.data?.stripe_subscription_status ?? null,
            stripe_trial_ends_at:
              profileResponse.data?.stripe_trial_ends_at ?? null,
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

  useEffect(() => {
    if (
      selectedPreviewVariantId &&
      !variants.some((variant) => variant.id === selectedPreviewVariantId)
    ) {
      setSelectedPreviewVariantId(null);
    }
  }, [selectedPreviewVariantId, variants]);

  useEffect(() => {
    if (
      accountAccess.allowedThemeIds &&
      !accountAccess.allowedThemeIds.includes(selectedTheme)
    ) {
      setSelectedTheme(accountAccess.allowedThemeIds[0] ?? "cosmic");
    }
  }, [accountAccess.allowedThemeIds, selectedTheme]);

  useEffect(() => {
    const limitedVariants = sanitizePageVariants(variants, accountAccess.variantLimit);
    if (limitedVariants.length === variants.length) {
      return;
    }

    setVariants(limitedVariants);
    if (
      selectedPreviewVariantId &&
      !limitedVariants.some((variant) => variant.id === selectedPreviewVariantId)
    ) {
      setSelectedPreviewVariantId(limitedVariants[0]?.id ?? null);
    }
  }, [accountAccess.variantLimit, selectedPreviewVariantId, variants]);

  useEffect(() => {
    if (checkoutReturnHandledRef.current || !returnedFromPublishCheckout) {
      return;
    }

    checkoutReturnHandledRef.current = true;

    if (pendingDraft) {
      applyDraft(pendingDraft.data);
      dismissDraft();
      setAutoPublishAfterCheckout(true);
      router.replace("/create", { scroll: false });
      return;
    }

    setError(
      "Your subscription was created, but we couldn't find the page draft to finish publishing. Rebuild or restore your page, then publish again.",
    );
    router.replace("/create", { scroll: false });
  }, [
    applyDraft,
    dismissDraft,
    pendingDraft,
    returnedFromPublishCheckout,
    router,
  ]);

  const beginReviewOutputs = useCallback(
    async (nextData: ResumeData, mode: InputMode) => {
      const structuredData = normalizeStructuredResumeData(nextData, jobSeekerProfile);
      const starterVariants = jobSeekerProfile
        ? [buildStarterVariant(structuredData, jobSeekerProfile)]
        : [];

      setParsedData(structuredData);
      setInputMode(mode);
      setCreateFlowFailure(null);
      setError("");
      setVariants(starterVariants);
      setSelectedPreviewVariantId(starterVariants[0]?.id ?? null);
      setStep("review");
    },
    [jobSeekerProfile],
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

  const progressStep = step === "processing" ? "review" : step;
  const currentProgressIndex = PROGRESS_STEPS.indexOf(progressStep as Exclude<Step, "processing">);
  const predictedSlug = publishedSlug || publicSlug || "your-username";
  const selectedPreviewVariant =
    variants.find((variant) => variant.id === selectedPreviewVariantId) ?? null;
  const previewData = parsedData
    ? applyPageVariant(parsedData, selectedPreviewVariant)
    : null;
  const readiness = parsedData
    ? buildDecisionReadinessState(parsedData, variants)
    : null;
  const publishTrialEndsAtLabel = formatFriendlyDate(accountAccess.trialEndsAt);
  const jobSeekerSummary = describeJobSeekerProfile(jobSeekerProfile);

  const publishPage = useCallback(async () => {
    if (!parsedData || publishingRef.current || !readiness) {
      return;
    }

    publishingRef.current = true;
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
          page_config: {
            variants,
            decision_readiness: readiness,
            job_search_profile: jobSeekerProfile,
          },
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
        if (response.status === 402 && result?.code === "checkout_required") {
          persistCurrentDraft();
          setShowPublishPlanModal(true);
          return;
        }

        if (response.status === 402 && result?.code === "subscription_required") {
          router.push(result.redirectTo ?? "/dashboard/settings");
          return;
        }

        throw new Error(result?.error ?? "Publish failed.");
      }

      const nextSlug = result?.slug ?? usernameFromEmail(user.email);
      setPublishedSlug(nextSlug);
      setPublishedPageId(result?.pageId ?? null);
      setPublicSlug(nextSlug);
      setStep("success");
      setShowPublishPlanModal(false);
      setAutoPublishAfterCheckout(false);
      clearDraft();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish page.");
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  }, [
    clearDraft,
    jobSeekerProfile,
    parsedData,
    persistCurrentDraft,
    readiness,
    resumeText,
    router,
    selectedTheme,
    variants,
  ]);

  const startPublishCheckout = useCallback(
    async (plan: "starter" | "pro") => {
      if (!parsedData) {
        return;
      }

      setBillingLoadingPlan(plan);
      setError("");
      persistCurrentDraft();

      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan,
            source: "publish",
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;

        if (!response.ok || !payload?.url) {
          throw new Error(payload?.error ?? "Could not start checkout.");
        }

        window.location.href = payload.url;
      } catch (checkoutError) {
        setBillingLoadingPlan(null);
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "Could not start checkout.",
        );
      }
    },
    [parsedData, persistCurrentDraft],
  );

  const handlePublishClick = useCallback(() => {
    if (publishing || billingLoadingPlan) {
      return;
    }

    if (accountAccess.requiresCheckoutToPublish) {
      persistCurrentDraft();
      setShowPublishPlanModal(true);
      return;
    }

    void publishPage();
  }, [
    accountAccess.requiresCheckoutToPublish,
    billingLoadingPlan,
    persistCurrentDraft,
    publishPage,
    publishing,
  ]);

  useEffect(() => {
    if (!autoPublishAfterCheckout || !parsedData) {
      return;
    }

    let cancelled = false;

    const finalizePublish = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/create");
        return;
      }

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const profileResponse = await fetchProfileWithHostingAccess<{
          plan?: string | null;
          username?: string | null;
          stripe_subscription_status?: string | null;
          stripe_trial_ends_at?: string | null;
        }>({
          supabase,
          select: "plan, username",
          matchField: "id",
          matchValue: user.id,
        });

        if (cancelled) {
          return;
        }

        const nextAccess = getAccountAccessState({
          plan: profileResponse.data?.plan ?? "spark",
          billing_cohort: profileResponse.data?.billing_cohort ?? null,
          hosting_trial_started_at:
            profileResponse.data?.hosting_trial_started_at ?? null,
          stripe_subscription_status:
            profileResponse.data?.stripe_subscription_status ?? null,
          stripe_trial_ends_at:
            profileResponse.data?.stripe_trial_ends_at ?? null,
        });

        setAccountAccess(nextAccess);
        setPublicSlug(profileResponse.data?.username ?? usernameFromEmail(user.email));

        if (nextAccess.hasPaidSubscription) {
          await publishPage();
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      if (cancelled) {
        return;
      }

      setAutoPublishAfterCheckout(false);
      setError(
        "Your plan is still activating. Give it another moment, then publish again if it doesn't finish automatically.",
      );
    };

    void finalizePublish();

    return () => {
      cancelled = true;
    };
  }, [autoPublishAfterCheckout, parsedData, publishPage, router]);

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
          <div className="mt-5">
            <JobSeekerStarterKit
              value={jobSeekerProfile}
              onChange={setJobSeekerProfile}
              compact
            />
          </div>
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
          <JobSeekerStarterKit
            value={jobSeekerProfile}
            onChange={setJobSeekerProfile}
            compact
          />
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

      {step === "review" && parsedData && previewData && readiness ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 2</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
              This is what someone will see when you send it.
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-[rgba(240,244,255,0.6)]">
              Your information is ready as a professional decision page. Tighten the parts that help someone decide faster, then publish it with the same Resume PDF and tracked link.
            </p>
          </div>

          {jobSeekerSummary ? (
            <section className="rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] p-5 sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
                Starter setup
              </p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                Built for {jobSeekerSummary.role.toLowerCase()} outreach
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.72)]">
                This page is being framed to {jobSeekerSummary.goal.toLowerCase()} with {jobSeekerSummary.audience.toLowerCase()} as the first audience. We also seeded {previewData.proofs?.length ?? 0} structured proof {previewData.proofs?.length === 1 ? "block" : "blocks"} from your existing content so the page starts with evidence, not just claims.
              </p>
            </section>
          ) : null}

          <DecisionReadinessCard readiness={readiness} />

          {accountAccess.variantLimit > 0 ? (
            <VariantPlanner
              baseData={parsedData}
              variants={variants}
              selectedVariantId={selectedPreviewVariantId}
              onSelectVariant={setSelectedPreviewVariantId}
              onChange={setVariants}
              maxVariants={accountAccess.variantLimit}
            />
          ) : (
            <section className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-5 sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
                Targeted versions
              </p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                Publish first to unlock targeted versions
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.72)]">
                Free preview keeps the build flow lightweight. Starter unlocks 1 targeted version,
                and Pro unlocks 3 with full analytics.
              </p>
              <button
                type="button"
                onClick={() => {
                  persistCurrentDraft();
                  setShowPublishPlanModal(true);
                }}
                className="mt-4 rounded-full border border-[rgba(59,130,246,0.35)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.46)] hover:text-[#BFDBFE]"
              >
                Choose plan to publish
              </button>
            </section>
          )}

          <div className="space-y-5">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Preview</p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                This is what someone will see when you send it
              </h3>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                {selectedPreviewVariant
                  ? `You are previewing "${selectedPreviewVariant.label}". Targeted links will open this version first.`
                  : "You are previewing the base page. Add a targeted version above if you want a sharper send for a recruiter, follow-up, or referral."}
              </p>
              <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.42)]">Your link</p>
                <div className="mt-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD]">
                  mylivingpage.com/{publicSlug || "your-username"}
                </div>
                {selectedPreviewVariant ? (
                  <p className="mt-2 text-sm text-[rgba(240,244,255,0.58)]">
                    The tracked share link for this version will include its own targeted URL automatically after publish.
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">Publish</p>
                  <p className="mt-2 text-sm leading-6 text-[#E8F2FF]">
                    {accountAccess.isLegacyAccount
                      ? "Your page goes live and turns on Resume PDF download from the public page."
                      : accountAccess.requiresCheckoutToPublish
                        ? "Preview is free. Add a card when you publish to start a 30-day Starter or Pro trial and make the page live."
                        : accountAccess.isTrialingSubscription
                          ? `Your ${accountAccess.publicPlanLabel} trial is active${publishTrialEndsAtLabel ? ` until ${publishTrialEndsAtLabel}` : ""}, and publishing will make this page live right away.`
                          : `Your ${accountAccess.publicPlanLabel} plan keeps this page live and downloadable.`}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(232,242,255,0.78)]">
                    {accountAccess.analyticsTier === "full"
                      ? "When someone opens this, you'll know."
                      : accountAccess.analyticsTier === "basic"
                        ? "Starter shows view counts in your dashboard as soon as people land on the page."
                        : "Publishing is the paywall moment. Pick Starter to keep it live, or Pro for full analytics."}
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
                    disabled={publishing || billingLoadingPlan !== null}
                    onClick={handlePublishClick}
                    className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-60"
                  >
                    {billingLoadingPlan
                      ? "Redirecting..."
                      : publishing
                        ? "Publishing..."
                        : accountAccess.requiresCheckoutToPublish
                          ? "Choose Plan to Publish"
                          : "Publish Page"}
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
                  <ResumeLayout data={previewData} />
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
              allowedThemeIds={accountAccess.allowedThemeIds}
              lockedLabel={accountAccess.hasPaidSubscription ? "Pro" : "Starter or Pro"}
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
                : accountAccess.isTrialingSubscription
                  ? `This is what you'll send instead of a PDF. Your ${accountAccess.publicPlanLabel} trial is active${publishTrialEndsAtLabel ? ` until ${publishTrialEndsAtLabel}` : ""}.`
                  : `This is what you'll send instead of a PDF. Your ${accountAccess.publicPlanLabel} plan is active.`}
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
                  Anyone viewing your page can download the Resume PDF directly from the same saved content, including any targeted version you share.
                </p>
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">
              First week plan
            </p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
              Use the page like a follow-up asset, not a profile dump.
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">1. Send it</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.72)]">
                  Use the tracked link in a recruiter reply, application follow-up, or referral handoff instead of attaching another file.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">2. Watch proof</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.72)]">
                  Start with the proof section and use the first-view loop below to see when interest is real.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">3. Tighten variants</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.72)]">
                  {variants.length > 0
                    ? `You already have ${variants.length} targeted ${variants.length === 1 ? "version" : "versions"} ready. Use the one that matches the next conversation.`
                    : "Add a targeted version after your first send so your next outreach matches the exact audience."}
                </p>
              </div>
            </div>
            {jobSeekerSummary ? (
              <p className="mt-4 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                Current setup: {jobSeekerSummary.role} page tuned to {jobSeekerSummary.goal.toLowerCase()} for {jobSeekerSummary.audience.toLowerCase()}.
              </p>
            ) : null}
          </section>

          {publishedPageId ? (
            <FirstViewActivationHub
              pageId={publishedPageId}
              livePath={`/${predictedSlug}`}
              analyticsHref={
                accountAccess.analyticsTier === "full"
                  ? `/dashboard/analytics/${publishedPageId}`
                  : "/dashboard"
              }
              analyticsCtaLabel={
                accountAccess.analyticsTier === "full"
                  ? "Open page analytics"
                  : "Open dashboard"
              }
              variants={variants}
              defaultVariantId={selectedPreviewVariantId}
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
                {accountAccess.analyticsTier === "full" ? (
                  <Link
                    href={`/dashboard/analytics/${publishedPageId}`}
                    className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                  >
                    Open Page Analytics
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(240,244,255,0.78)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
                  >
                    Open Dashboard
                  </Link>
                )}
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

      {showPublishPlanModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,7,18,0.75)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,17,28,0.96)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#93C5FD]">
                  Publish your page
                </p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
                  Choose a plan and start your 30-day free trial
                </h2>
                <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.64)]">
                  Free is for building and previewing. To make this page live, add a payment
                  method now. You won&apos;t be charged for 30 days, and you can cancel anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!billingLoadingPlan) {
                    setShowPublishPlanModal(false);
                  }
                }}
                className="rounded-full border border-[rgba(255,255,255,0.12)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.6)] transition-colors hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">Starter</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                  {STARTER_PLAN_PRICE.amountLabel}
                  <span className="ml-2 text-base font-normal text-[rgba(240,244,255,0.52)]">
                    {STARTER_PLAN_PRICE.intervalLabel}
                  </span>
                </h3>
                <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.64)]">
                  Keep one page live with the current starter theme set, share cards, and
                  dashboard view counts.
                </p>
                <div className="mt-4 space-y-2 text-sm text-[rgba(240,244,255,0.78)]">
                  <p>Unlimited live hosting</p>
                  <p>9 themes</p>
                  <p>1 targeted version</p>
                  <p>Basic analytics in dashboard</p>
                  <p>Share card downloads</p>
                </div>
                <button
                  type="button"
                  disabled={billingLoadingPlan !== null}
                  onClick={() => void startPublishCheckout("starter")}
                  className="mt-6 w-full rounded-full border border-[rgba(59,130,246,0.3)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#93C5FD] transition-colors hover:border-[rgba(59,130,246,0.42)] hover:text-[#BFDBFE] disabled:opacity-50"
                >
                  {billingLoadingPlan === "starter"
                    ? "Redirecting..."
                    : "Start Starter Trial"}
                </button>
              </article>

              <article className="rounded-2xl border border-[rgba(59,130,246,0.26)] bg-[rgba(59,130,246,0.1)] p-5 shadow-[0_16px_48px_rgba(59,130,246,0.12)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#BFDBFE]">Pro</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                  {PRO_PLAN_PRICE.amountLabel}
                  <span className="ml-2 text-base font-normal text-[rgba(240,244,255,0.52)]">
                    {PRO_PLAN_PRICE.intervalLabel}
                  </span>
                </h3>
                <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.72)]">
                  The full version for active job seekers who want deeper analytics, all themes,
                  and more targeted links.
                </p>
                <div className="mt-4 space-y-2 text-sm text-[rgba(240,244,255,0.86)]">
                  <p>Unlimited live hosting</p>
                  <p>All 40+ themes</p>
                  <p>3 targeted versions</p>
                  <p>Full analytics, engagement, and device details</p>
                  <p>Share card downloads</p>
                </div>
                <button
                  type="button"
                  disabled={billingLoadingPlan !== null}
                  onClick={() => void startPublishCheckout("pro")}
                  className="gold-pill mt-6 w-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-50"
                >
                  {billingLoadingPlan === "pro" ? "Redirecting..." : "Start Pro Trial"}
                </button>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
