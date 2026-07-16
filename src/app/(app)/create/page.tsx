"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AtsReadinessCard, {
  type AtsReadinessReviewState,
} from "@/components/AtsReadinessCard";
import GuidedFlow from "@/components/create/GuidedFlow";
import DownloadResumeButton from "@/components/DownloadResumeButton";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ShareCardDownload from "@/components/ShareCardDownload";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import {
  PUBLISH_CC_TRIAL_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";
import { buildDecisionReadinessState } from "@/lib/decision-readiness";
import {
  getGuidedStepForAtsFix,
  type AtsFixTarget,
} from "@/lib/ats-fix-target";
import type { AtsReadinessCheck } from "@/lib/ats-readiness";
import { normalizeStructuredResumeData } from "@/lib/job-seeker-starter";
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

type Step = "input" | "review" | "success";

interface CreateDraft {
  resumeText: string;
  guidedData: Partial<ResumeData>;
  guidedStep?: number;
  parsedData: ResumeData | null;
  selectedTheme: ThemeId;
  step: Step;
  variants: PageVariant[];
  selectedPreviewVariantId: string | null;
  jobSeekerProfile: JobSeekerProfile | null;
}

const PROGRESS_STEPS = [
  { id: "input", label: "Details" },
  { id: "review", label: "Design & check" },
  { id: "success", label: "Share" },
] as const satisfies ReadonlyArray<{ id: Step; label: string }>;
const ONBOARDING_THEME_IDS = ["cosmic", "ember", "aurora", "prism", "tempest", "obsidian"] as const;
const ONBOARDING_THEMES = THEME_REGISTRY.filter((theme) =>
  ONBOARDING_THEME_IDS.includes(theme.id as (typeof ONBOARDING_THEME_IDS)[number]),
);
const LEGACY_CREATE_DRAFT_KEY = "mlp-draft-create";

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

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("input");
  const [guidedStep, setGuidedStep] = useState(0);
  const [guidedData, setGuidedData] = useState<Partial<ResumeData>>(EMPTY_GUIDED_DATA);
  const [resumeText, setResumeText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("cosmic");
  const [error, setError] = useState("");
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [publishedPageId, setPublishedPageId] = useState<string | null>(null);
  const [variants, setVariants] = useState<PageVariant[]>([]);
  const [selectedPreviewVariantId, setSelectedPreviewVariantId] = useState<string | null>(null);
  const [atsReviewState, setAtsReviewState] = useState<AtsReadinessReviewState>({
    targetTitle: "",
    jobDescription: "",
    completedCheck: null,
  });
  const [activeAtsFix, setActiveAtsFix] = useState<{
    target: AtsFixTarget;
    title: string;
  } | null>(null);
  const [jobSeekerProfile] = useState<JobSeekerProfile | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accountAccess, setAccountAccess] = useState(() =>
    getAccountAccessState({
      plan: "spark",
      billing_cohort: PUBLISH_CC_TRIAL_BILLING_COHORT,
    }),
  );
  const [publishRestoredDraft, setPublishRestoredDraft] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);
  const atPageLimit = pageCount >= MAX_PAGES_PER_ACCOUNT;
  const legacyCheckoutReturnHandledRef = useRef(false);
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
        selectedTheme !== "cosmic",
    );
  }, [guidedData.name, parsedData, resumeText, selectedTheme, step, variants.length]);

  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (!isDirty || step === "success") {
      return;
    }

    saveDraft({
      resumeText,
      guidedData,
      guidedStep,
      parsedData,
      selectedTheme,
      step,
      variants,
      selectedPreviewVariantId,
      jobSeekerProfile,
    });
  }, [
    guidedData,
    guidedStep,
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
    setGuidedStep(
      typeof draft.guidedStep === "number"
        ? Math.min(Math.max(Math.round(draft.guidedStep), 0), 5)
        : 0,
    );
    setParsedData(draft.parsedData ?? null);
    setSelectedTheme(draft.selectedTheme ?? "cosmic");
    setStep(draft.step === "review" && draft.parsedData ? "review" : "input");
    setVariants(draft.variants ?? []);
    setSelectedPreviewVariantId(draft.selectedPreviewVariantId ?? null);
    setError("");
  }, []);

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
    if (legacyCheckoutReturnHandledRef.current || !returnedFromPublishCheckout) {
      return;
    }

    legacyCheckoutReturnHandledRef.current = true;

    if (pendingDraft) {
      applyDraft(pendingDraft.data);
      dismissDraft();
      setPublishRestoredDraft(true);
      router.replace("/create", { scroll: false });
      return;
    }

    setError(
      "We couldn't find the saved page draft to finish publishing. Rebuild or restore your page, then publish again.",
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
    (nextData: ResumeData) => {
      const structuredData = normalizeStructuredResumeData(nextData, jobSeekerProfile);
      const returningFromAtsFix = activeAtsFix !== null;

      setParsedData(structuredData);
      setGuidedData(structuredData);
      setActiveAtsFix(null);
      setError("");
      if (!returningFromAtsFix) {
        setVariants([]);
        setSelectedPreviewVariantId(null);
      }
      setStep("review");
    },
    [activeAtsFix, jobSeekerProfile],
  );

  const beginAtsFix = useCallback(
    (target: AtsFixTarget, check: AtsReadinessCheck) => {
      if (!parsedData) {
        return;
      }

      setGuidedData(parsedData);
      setGuidedStep(getGuidedStepForAtsFix(target.section));
      setActiveAtsFix({ target, title: check.title });
      setStep("input");
    },
    [parsedData],
  );

  const currentProgressIndex = PROGRESS_STEPS.findIndex(
    (progressStep) => progressStep.id === step,
  );
  const predictedSlug = publishedSlug || publicSlug || "your-username";
  const selectedPreviewVariant =
    variants.find((variant) => variant.id === selectedPreviewVariantId) ?? null;
  const previewData = parsedData
    ? applyPageVariant(parsedData, selectedPreviewVariant)
    : null;
  const readiness = parsedData
    ? buildDecisionReadinessState(parsedData, variants)
    : null;

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
          raw_resume: "",
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
      } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Publish failed.");
      }

      const nextSlug = result?.slug ?? usernameFromEmail(user.email);
      setPublishedSlug(nextSlug);
      setPublishedPageId(result?.pageId ?? null);
      setPublicSlug(nextSlug);
      setStep("success");
      setPublishRestoredDraft(false);
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
    readiness,
    router,
    selectedTheme,
    variants,
  ]);

  const handlePublishClick = useCallback(() => {
    if (publishing) {
      return;
    }

    void publishPage();
  }, [publishPage, publishing]);

  useEffect(() => {
    if (!publishRestoredDraft || !parsedData) {
      return;
    }

    setPublishRestoredDraft(false);
    void publishPage();
  }, [parsedData, publishPage, publishRestoredDraft]);

  const copyPublishedLink = useCallback(async () => {
    try {
      const liveUrl = new URL(`/${predictedSlug}`, window.location.origin).toString();
      await navigator.clipboard.writeText(liveUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2400);
    } catch {
      setError("We could not copy the link automatically. Open your page and copy the URL from your browser.");
    }
  }, [predictedSlug]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mb-6 grid gap-5 sm:mb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#60A5FA]">Build your living resume</p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl md:text-4xl">
            Add it once. Use it everywhere.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
            Your draft saves as you go and stays private until you choose Publish.
          </p>
        </div>
        <ol className="grid grid-cols-3 gap-2" aria-label="Resume setup progress">
          {PROGRESS_STEPS.map((progressStep, index) => (
            <li
              key={progressStep.id}
              aria-current={step === progressStep.id ? "step" : undefined}
              className={`min-w-0 rounded-xl border px-3 py-2.5 ${
                currentProgressIndex >= index
                  ? "border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.1)]"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]"
              }`}
            >
              <p className="font-mono text-[9px] text-[rgba(147,197,253,0.68)]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className={`mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] ${
                currentProgressIndex >= index ? "text-[#BFDBFE]" : "text-[rgba(240,244,255,0.38)]"
              }`}>
                {progressStep.label}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {error ? (
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

      {!atPageLimit && step === "input" ? (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4 sm:grid-cols-3 sm:p-5">
            {[
              ["Private by default", "Nothing goes live until you publish."],
              ["Saved as you go", "Your draft stays on this browser."],
              ["No AI processing", "Your details are never sent to a model."],
            ].map(([title, body]) => (
              <div key={title}>
                <p className="text-xs font-semibold text-[#BFDBFE]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[rgba(240,244,255,0.55)]">{body}</p>
              </div>
            ))}
          </div>
          {resumeText.trim() ? (
            <details className="rounded-xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.07)] p-4">
              <summary className="cursor-pointer text-sm font-medium text-[#FDE68A]">
                Your saved resume text is available as a reference
              </summary>
              <p className="mt-3 text-xs leading-5 text-[rgba(240,244,255,0.58)]">
                This came from an older draft. Copy the details you want into the guided fields
                below. The text is kept locally and is not sent to an AI provider.
              </p>
              <textarea
                readOnly
                value={resumeText}
                aria-label="Saved resume text reference"
                className="mt-3 min-h-48 w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.18)] p-4 font-mono text-xs leading-6 text-[rgba(240,244,255,0.72)] focus:border-[#3B82F6] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setResumeText("")}
                className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.58)] transition-colors hover:text-[#F0F4FF]"
              >
                Remove saved reference
              </button>
            </details>
          ) : null}
          <GuidedFlow
            guidedData={guidedData}
            onUpdate={setGuidedData}
            step={guidedStep}
            onStepChange={setGuidedStep}
            atsFix={activeAtsFix}
            onComplete={(data) => {
              beginReviewOutputs(data);
            }}
            onBack={() => router.push("/dashboard")}
          />
        </section>
      ) : null}

      {step === "review" && parsedData && previewData && readiness ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#60A5FA]">Design & check</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-[#F0F4FF] sm:text-3xl">
              Make it feel like you, then check the essentials.
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-[rgba(240,244,255,0.6)]">
              Choose a style, review the page, and use the ATS check to catch common issues. You can edit everything later.
            </p>
          </div>

          <section data-testid="create-theme-section" className="space-y-4 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-4 sm:p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">Choose a look</p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">Start with a polished theme</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(240,244,255,0.58)]">
                Pick what feels right now. You can change it anytime without rebuilding your resume.
              </p>
            </div>
            <ThemePicker
              themes={ONBOARDING_THEMES}
              selectedThemeId={selectedTheme}
              onSelectTheme={setSelectedTheme}
              allowedThemeIds={accountAccess.allowedThemeIds}
              lockedLabel="Not available"
              showDescription
              showFilters={false}
            />
            <p className="text-xs leading-6 text-[rgba(240,244,255,0.46)]">
              More themes are available from the editor after you publish.
            </p>
          </section>

          <AtsReadinessCard
            resumeData={parsedData}
            reviewState={atsReviewState}
            onReviewStateChange={setAtsReviewState}
            onFixRequested={beginAtsFix}
          />

          <div className="space-y-5">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#3B82F6]">Preview</p>
              <h3 className="mt-2 font-heading text-2xl font-semibold text-[#F0F4FF]">
                This is what someone will see when you send it
              </h3>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                {selectedPreviewVariant
                  ? `You are previewing "${selectedPreviewVariant.label}". Targeted links will open this version first.`
                  : "This preview uses the same saved details that will power your live page, PDF, and share card."}
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
                    Your page goes live with one shareable link and an ATS-ready PDF download.
                    Publishing is free and does not require a card.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(232,242,255,0.78)]">
                    You can edit the page, PDF, and share card from the same saved details anytime.
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
                    onClick={handlePublishClick}
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
                  <ResumeLayout data={previewData} />
                </div>
              </ThemeCanvas>
            </div>
          </div>

        </section>
      ) : null}

      {step === "success" ? (
        <section className="space-y-5">
          <div className="glass-card overflow-hidden rounded-[2rem] p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex rounded-full border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#86EFAC]">
                  Published
                </p>
                <h2 className="mt-4 font-heading text-3xl font-bold text-[#F0F4FF] sm:text-4xl">
                  Your living resume is live.
                </h2>
                <p className="mt-3 text-sm leading-7 text-[rgba(240,244,255,0.62)]">
                  Choose what you need next: copy the link, open the page, download the PDF, or create your share card.
                </p>
              </div>
              <span className="font-mono text-xs text-[rgba(147,197,253,0.72)]">03 / 03</span>
            </div>

            <div className="mt-6 rounded-2xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#93C5FD]">Your permanent link</p>
              <p className="mt-2 break-all font-mono text-sm text-[#DBEAFE] sm:text-base">
                mylivingpage.com/{predictedSlug}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => void copyPublishedLink()}
                className="gold-pill flex min-h-12 items-center justify-center px-5 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5"
              >
                {linkCopied ? "Link copied" : "Copy My Link"}
              </button>
              <Link
                href={`/${predictedSlug}`}
                className="flex min-h-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.025)] px-5 py-3 text-center text-sm font-semibold text-[rgba(240,244,255,0.78)] transition-all hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.35)] hover:text-[#BFDBFE]"
              >
                Open My Page
              </Link>
              {publishedPageId && parsedData ? (
                <DownloadResumeButton
                  data={parsedData}
                  pageId={publishedPageId}
                  onErrorChange={setDownloadError}
                  className="min-h-12 w-full justify-center"
                />
              ) : null}
              {publishedPageId && parsedData && currentUserId ? (
                <ShareCardDownload
                  pageId={publishedPageId}
                  pageUserId={currentUserId}
                  slug={predictedSlug}
                  themeId={selectedTheme}
                  resumeData={parsedData}
                  analyticsHref={`/dashboard/analytics/${publishedPageId}`}
                  className="min-h-12 w-full justify-center"
                />
              ) : null}
            </div>

            {downloadError ? (
              <p role="alert" className="mt-4 rounded-xl border border-[rgba(255,142,142,0.2)] bg-[rgba(255,142,142,0.07)] px-4 py-3 text-sm text-[#ffb4b4]">
                {downloadError}
              </p>
            ) : null}

            <p className="mt-5 text-xs leading-6 text-[rgba(240,244,255,0.5)]">
              Your PDF and share card use the same saved information as your page, so all three stay consistent when you make an update.
            </p>
          </div>

          <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#93C5FD]">Keep it current</p>
              <h3 className="mt-2 font-heading text-xl font-semibold text-[#F0F4FF]">
                Update once and every output stays aligned.
              </h3>
              <p className="mt-2 text-sm leading-6 text-[rgba(240,244,255,0.58)]">
                Edit your details, customize your public URL, or check page activity from your dashboard.
              </p>
            </div>
            {publishedPageId ? (
              <div className="mt-5 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0 sm:justify-end">
                <Link
                  href={`/dashboard/edit/${publishedPageId}/living-page`}
                  className="gold-pill px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em]"
                >
                  Edit Resume
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="rounded-full border border-[rgba(255,255,255,0.14)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.72)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#BFDBFE]"
                >
                  Customize URL
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-[rgba(255,255,255,0.14)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[rgba(240,244,255,0.72)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#BFDBFE]"
                >
                  Dashboard
                </Link>
              </div>
            ) : null}
          </section>
        </section>
      ) : null}

    </main>
  );
}
