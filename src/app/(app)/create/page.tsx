"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AtsReadinessCard from "@/components/AtsReadinessCard";
import GuidedFlow from "@/components/create/GuidedFlow";
import FirstViewActivationHub from "@/components/create/FirstViewActivationHub";
import JobSeekerStarterKit from "@/components/create/JobSeekerStarterKit";
import ResumeImport from "@/components/create/ResumeImport";
import VariantPlanner from "@/components/VariantPlanner";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import {
  PUBLISH_CC_TRIAL_BILLING_COHORT,
  getAccountAccessState,
} from "@/lib/account-access";
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

type Step = "input" | "review" | "success";

interface CreateDraft {
  resumeText: string;
  guidedData: Partial<ResumeData>;
  parsedData: ResumeData | null;
  selectedTheme: ThemeId;
  step: Step;
  variants: PageVariant[];
  selectedPreviewVariantId: string | null;
  jobSeekerProfile: JobSeekerProfile;
}

const PROGRESS_STEPS: Array<{ id: Step; label: string }> = [
  { id: "input", label: "Details" },
  { id: "review", label: "Review" },
  { id: "success", label: "Share" },
];
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

const DEFAULT_JOB_SEEKER_PROFILE: JobSeekerProfile = {
  role_track: "general",
  primary_goal: "share_profile",
  target_audience: "general_public",
};

function hasGuidedDraftContent(data: Partial<ResumeData>) {
  const hasText = [
    data.name,
    data.headline,
    data.location,
    data.email,
    data.linkedin,
    data.github,
    data.website,
    data.summary,
  ].some((value) => value?.trim());
  const hasListContent = [
    data.experience,
    data.education,
    data.projects,
    data.certifications,
    data.stats,
    data.proofs,
    data.testimonials,
  ].some((items) => (items?.length ?? 0) > 0);
  const hasSkills = data.skills?.some((group) => group.items.some((item) => item.trim())) ?? false;

  return hasText || hasListContent || hasSkills;
}

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("input");
  const [guidedData, setGuidedData] = useState<Partial<ResumeData>>(EMPTY_GUIDED_DATA);
  const [resumeText, setResumeText] = useState("");
  const [guidedFlowVersion, setGuidedFlowVersion] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("cosmic");
  const [error, setError] = useState("");
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
  const [publishRestoredDraft, setPublishRestoredDraft] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);
  const [copyLinkState, setCopyLinkState] = useState<"idle" | "copied" | "error">("idle");
  const copyLinkTimerRef = useRef<number | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const previousStepRef = useRef<Step | null>(null);
  const guidedFlowSectionRef = useRef<HTMLDivElement | null>(null);
  const atPageLimit = pageCount >= MAX_PAGES_PER_ACCOUNT;
  const legacyCheckoutReturnHandledRef = useRef(false);
  const publishingRef = useRef(false);
  const returnedFromPublishCheckout =
    searchParams.get("checkout") === "success" &&
    searchParams.get("source") === "publish";

  const createDraftKey = currentUserId ? `mlp-draft-create-${currentUserId}` : null;
  const { pendingDraft, hydrated: draftHydrated, saveDraft, clearDraft, dismissDraft } =
    useLocalDraft<CreateDraft>(createDraftKey);

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

  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (!isDirty || step === "success") {
      return;
    }

    saveDraft({
      resumeText,
      guidedData,
      parsedData,
      selectedTheme,
      step,
      variants,
      selectedPreviewVariantId,
      jobSeekerProfile,
    });
  }, [
    guidedData,
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
    // Remount GuidedFlow so its per-row input ids re-derive from the restored data.
    setGuidedFlowVersion((version) => version + 1);
    setParsedData(draft.parsedData ?? null);
    setSelectedTheme(draft.selectedTheme ?? "cosmic");
    setStep(draft.step === "review" && draft.parsedData ? "review" : "input");
    setVariants(draft.variants ?? []);
    setSelectedPreviewVariantId(draft.selectedPreviewVariantId ?? null);
    setJobSeekerProfile(draft.jobSeekerProfile ?? DEFAULT_JOB_SEEKER_PROFILE);
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
    if (previousStepRef.current === null || previousStepRef.current === step) {
      previousStepRef.current = step;
      return;
    }

    previousStepRef.current = step;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => () => {
    if (copyLinkTimerRef.current !== null) {
      window.clearTimeout(copyLinkTimerRef.current);
    }
  }, []);

  const focusGuidedFlow = useCallback(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    guidedFlowSectionRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    guidedFlowSectionRef.current?.focus({ preventScroll: true });
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

    // The draft key resolves only after the signed-in user loads, and the
    // draft store hydrates one render later. Wait for both so the "draft not
    // found" branch never fires before the real user-scoped draft was checked.
    if (createDraftKey === null || !draftHydrated) {
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
    createDraftKey,
    dismissDraft,
    draftHydrated,
    pendingDraft,
    returnedFromPublishCheckout,
    router,
  ]);

  const beginReviewOutputs = useCallback(
    (nextData: ResumeData) => {
      const structuredData = normalizeStructuredResumeData(nextData, jobSeekerProfile);
      const starterVariants = jobSeekerProfile
        ? [buildStarterVariant(structuredData, jobSeekerProfile)]
        : [];

      setParsedData(structuredData);
      setError("");
      setVariants(starterVariants);
      setSelectedPreviewVariantId(starterVariants[0]?.id ?? null);
      setStep("review");
    },
    [jobSeekerProfile],
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
  const jobSeekerSummary = describeJobSeekerProfile(jobSeekerProfile);

  const copyLiveLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${predictedSlug}`);
      setCopyLinkState("copied");

      if (publishedPageId) {
        void fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "page.share.copy_link",
            metadata: {
              page_id: publishedPageId,
              surface: "create_success",
              mode: "link_only",
              share_path: `/${predictedSlug}`,
            },
          }),
          keepalive: true,
        }).catch(() => {
          // Tracking should never block the share action.
        });
      }
    } catch {
      setCopyLinkState("error");
    }

    if (copyLinkTimerRef.current !== null) {
      window.clearTimeout(copyLinkTimerRef.current);
    }
    copyLinkTimerRef.current = window.setTimeout(() => {
      copyLinkTimerRef.current = null;
      setCopyLinkState("idle");
    }, 2400);
  }, [predictedSlug, publishedPageId]);

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

  return (
    <main id="main-content" tabIndex={-1} className="site-container-wide py-6 sm:py-8">
      <div className="mb-5 flex flex-col gap-4 sm:mb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="site-eyebrow">Create your page</p>
          <h1
            tabIndex={-1}
            ref={step === "input" ? stepHeadingRef : undefined}
            className="site-page-title mt-2 max-w-4xl outline-none"
          >
            Build your page, send it, know when they open it
          </h1>
        </div>
        <ol aria-label="Create progress" className="flex flex-wrap gap-x-4 gap-y-2">
          {PROGRESS_STEPS.map((progressStep, index) => {
            const isCurrent = index === currentProgressIndex;
            const isDone = index < currentProgressIndex;

            return (
              <li
                key={progressStep.id}
                aria-current={isCurrent ? "step" : undefined}
                className="flex items-center gap-2"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center border text-xs font-semibold ${
                    isCurrent
                      ? "border-site-action bg-site-action text-site-action-ink"
                      : isDone
                        ? "border-site-action text-site-action"
                        : "border-site-border text-site-secondary"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isCurrent ? "text-site-text" : "text-site-secondary"
                  }`}
                >
                  {progressStep.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {error ? (
        <div role="alert" className="site-alert-danger mb-4 flex items-start gap-2 px-4 py-3 text-sm">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.75v3.75" strokeLinecap="square" />
            <path d="M8 11.25h.01" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      ) : null}

      {pendingDraft && step === "input" && !isDirty ? (
        <div className="mb-4">
          <DraftBanner savedAt={pendingDraft.savedAt} onRestore={restoreDraft} onDiscard={dismissDraft} />
        </div>
      ) : null}

      {atPageLimit ? (
        <section className="site-panel p-5 text-center sm:p-8">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-site-border-strong bg-site-surface-raised text-site-secondary"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="7" width="10" height="6.5" />
              <path d="M5.5 7V4.75a2.5 2.5 0 0 1 5 0V7" />
            </svg>
          </div>
          <h2 className="site-panel-title">Page limit reached</h2>
          <p className="mt-2 text-sm text-site-secondary">
            Each account supports {MAX_PAGES_PER_ACCOUNT} public page in v1. Edit your current page, or delete it
            before creating a replacement.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="site-button site-button-primary mt-5"
          >
            Go to your page
          </button>
        </section>
      ) : null}

      {!atPageLimit && step === "input" ? (
        <section className="space-y-4">
          <ResumeImport
            hasExistingData={Boolean(
              resumeText.trim() || hasGuidedDraftContent(guidedData),
            )}
            onImported={(result) => {
              setResumeText(result.text);
              setGuidedData(result.data);
              setParsedData(null);
              setVariants([]);
              setSelectedPreviewVariantId(null);
              setError("");
              setGuidedFlowVersion((version) => version + 1);
            }}
            onReviewRequest={focusGuidedFlow}
          />
          <JobSeekerStarterKit
            value={jobSeekerProfile}
            onChange={setJobSeekerProfile}
            compact
          />
          <div className="site-callout p-4">
            <div>
              <p className="site-eyebrow">
                Private guided entry
              </p>
              <p className="mt-2 text-sm leading-6 text-site-text">
                {resumeText.trim()
                  ? "Review all autofilled fields together, then choose a theme and inspect the complete page before publishing."
                  : "Add your details section by section, then choose a theme and inspect the complete page before publishing."}{" "}
                Résumé imports are used only to autofill editable fields—no AI service reads or
                rewrites your résumé.
              </p>
            </div>
          </div>
          {resumeText.trim() ? (
            <details className="site-panel p-4">
              <summary className="cursor-pointer text-sm font-semibold text-site-text">
                Imported résumé text is available as a reference
              </summary>
              <p className="mt-3 text-xs leading-5 text-site-secondary">
                This text stays in your local draft so you can compare it with the autofilled
                fields below. It is not saved with your published page.
              </p>
              <textarea
                readOnly
                value={resumeText}
                aria-label="Saved résumé text reference"
                className="site-field mt-3 min-h-48 p-4 text-base leading-6 sm:text-xs"
              />
              <button
                type="button"
                onClick={() => setResumeText("")}
                className="site-button site-button-secondary mt-3"
              >
                Remove saved reference
              </button>
            </details>
          ) : null}
          <div
            ref={guidedFlowSectionRef}
            tabIndex={-1}
            className="scroll-mt-24 outline-none"
          >
            <GuidedFlow
              key={guidedFlowVersion}
              guidedData={guidedData}
              onUpdate={setGuidedData}
              onComplete={(data) => {
                beginReviewOutputs(data);
              }}
              onBack={() => router.push("/dashboard")}
              consolidatedReview={Boolean(resumeText.trim())}
            />
          </div>
        </section>
      ) : null}

      {!atPageLimit && step === "review" && parsedData && previewData && readiness ? (
        <section className="space-y-5">
          <div>
            <p className="site-eyebrow">Review</p>
            <h2
              tabIndex={-1}
              ref={stepHeadingRef}
              className="site-section-title mt-2 outline-none"
            >
              Review your page before it goes live
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-site-secondary">
              Your information is ready as a professional decision page. Tighten the parts that help someone decide faster, then publish it with the same Résumé PDF and tracked link.
            </p>
          </div>

          {jobSeekerSummary ? (
            <section className="site-callout p-5 sm:p-6">
              <p className="site-eyebrow">
                Starter setup
              </p>
              <h3 className="site-panel-title mt-2">
                Built for how you plan to share it
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-site-secondary">
                This {jobSeekerSummary.role.toLowerCase()} page is being framed to {jobSeekerSummary.goal.toLowerCase()} with {jobSeekerSummary.audience.toLowerCase()} as the first audience. We also seeded {previewData.proofs?.length ?? 0} structured proof {previewData.proofs?.length === 1 ? "block" : "blocks"} from your existing content so the page starts with evidence, not just claims.
              </p>
            </section>
          ) : null}

          <AtsReadinessCard resumeData={parsedData} />

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
            <section className="site-callout p-5 sm:p-6">
              <p className="site-eyebrow">
                Targeted versions
              </p>
              <h3 className="site-panel-title mt-2">
                One clear résumé, one reliable link
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-site-secondary">
                This streamlined version keeps the focus on your main résumé. You can still edit
                it anytime after publishing.
              </p>
            </section>
          )}

          <section data-testid="create-theme-section" className="space-y-4">
            <div>
              <p className="site-eyebrow">Theme</p>
              <h3 className="site-panel-title mt-2">Make it feel like you</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-site-secondary">
                Choose a style, then inspect the complete page below before it goes live.
              </p>
            </div>
            <ThemePicker
              themes={THEME_REGISTRY}
              selectedThemeId={selectedTheme}
              onSelectTheme={setSelectedTheme}
              allowedThemeIds={accountAccess.allowedThemeIds}
              lockedLabel="Paid plan"
              showDescription
            />
          </section>

          <div className="space-y-5">
            <div className="site-panel p-4 sm:p-5">
              <p className="site-eyebrow">Preview</p>
              <h3 className="site-panel-title mt-2">
                This is what someone will see when you send it
              </h3>
              <p className="mt-2 text-sm leading-6 text-site-secondary">
                {selectedPreviewVariant
                  ? `You are previewing "${selectedPreviewVariant.label.trim() || "Untitled version"}". Targeted links will open this version first.`
                  : "You are previewing the base page. Add a targeted version above if you want a sharper send for a specific conversation or audience."}
              </p>
              {selectedPreviewVariant ? (
                <p className="mt-2 text-sm text-site-secondary">
                  The tracked share link for this version will include its own targeted URL automatically after publish.
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden border border-site-border-strong bg-site-canvas-alt">
              <div className="flex items-center gap-2 border-b border-site-border bg-site-canvas px-4 py-3">
                <span aria-hidden="true" className="h-2 w-2 bg-site-border-strong" />
                <span aria-hidden="true" className="h-2 w-2 bg-site-border-strong" />
                <span aria-hidden="true" className="h-2 w-2 bg-site-border-strong" />
                <div className="ml-3 min-w-0 truncate border border-site-border bg-site-surface px-3 py-1 text-xs text-site-secondary">
                  mylivingpage.com/<span className="text-site-action">{publicSlug || "your-username"}</span>
                </div>
              </div>
              <ThemeCanvas
                themeId={selectedTheme}
                height="min(540px, calc(100dvh - 280px))"
                className="rounded-none"
                motionAware
              >
                <div className="h-full">
                  <ResumeLayout data={previewData} />
                </div>
              </ThemeCanvas>
            </div>

            <div className="site-callout p-4 sm:p-5">
              <p className="site-eyebrow">Ready to publish?</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-site-text">
                This is the only publish step. Your page goes live with one shareable link and
                an ATS-ready PDF download. Publishing is free and does not require a card.
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-site-secondary">
                You can edit or unpublish it later from your dashboard.
              </p>
            </div>

            <div className="sticky bottom-0 z-20 border-t border-site-border bg-site-surface px-4 py-3 sm:px-5">
              {error ? (
                <div
                  aria-hidden="true"
                  className="site-alert-danger mb-3 flex items-start gap-2 px-4 py-3 text-sm"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="8" cy="8" r="6.5" />
                    <path d="M8 4.75v3.75" strokeLinecap="square" />
                    <path d="M8 11.25h.01" strokeLinecap="round" />
                  </svg>
                  <span>{error}</span>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="site-button site-button-secondary"
                >
                  Back to details
                </button>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={handlePublishClick}
                  className="site-button site-button-primary min-w-32 disabled:opacity-60"
                >
                  {publishing ? "Publishing…" : "Publish page"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {step === "success" ? (
        <section className="space-y-5">
          <div className="site-panel p-5 sm:p-8">
            <p className="site-eyebrow">Share</p>
            <h2
              tabIndex={-1}
              ref={stepHeadingRef}
              className="site-section-title mt-2 outline-none"
            >
              Your page is live
            </h2>
            <p className="mt-2 text-sm leading-7 text-site-secondary">
              Share this living résumé as a link, or download the ATS-ready résumé PDF whenever
              you need a file.
            </p>

            <div className="mt-5 border border-site-border bg-site-canvas-alt p-4">
              <p className="site-eyebrow text-site-muted">Your link</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div
                  title={`mylivingpage.com/${predictedSlug}`}
                  className="min-w-0 flex-1 truncate border border-site-border-strong bg-site-canvas px-3 py-2 text-sm text-site-action"
                >
                  mylivingpage.com/{predictedSlug}
                </div>
                <button
                  type="button"
                  onClick={() => void copyLiveLink()}
                  className="site-button site-button-secondary min-w-28 shrink-0"
                >
                  {copyLinkState === "copied" ? "Copied" : "Copy link"}
                </button>
              </div>
              {copyLinkState === "error" ? (
                <p role="alert" className="mt-2 text-sm text-site-danger">
                  Could not copy the link. Copy the URL above manually.
                </p>
              ) : null}
              {copyLinkState === "copied" ? (
                <p role="status" className="sr-only">Link copied to clipboard.</p>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-site-secondary">
                When someone reads this, we&apos;ll email you — once per person, and only
                once they actually read it.
              </p>
            </div>

            <div className="mt-5">
              <div className="border-t border-site-border py-4">
                <p className="site-eyebrow">Page</p>
                <h3 className="site-panel-title mt-2">Live now</h3>
                <p className="mt-2 break-words text-sm leading-6 text-site-text">
                  Your public page is live at mylivingpage.com/{predictedSlug}.
                </p>
              </div>
              <div className="border-t border-site-border pt-4">
                <p className="site-eyebrow">Résumé PDF</p>
                <h3 className="site-panel-title mt-2">Ready from the live page</h3>
                <p className="mt-2 text-sm leading-6 text-site-text">
                  Anyone viewing your page can download the PDF directly from the same saved content, including any targeted version you share.
                </p>
              </div>
            </div>
          </div>

          <section className="site-panel p-5 sm:p-6">
            <p className="site-eyebrow">
              First week plan
            </p>
            <h3 className="site-panel-title mt-2">
              Put the page to work in one real conversation
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="border-l-2 border-site-action bg-site-canvas-alt p-4">
                <p className="site-eyebrow">1. Share it</p>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  Send the tracked link in a follow-up, introduction, proposal, application, or event conversation instead of explaining everything again.
                </p>
              </div>
              <div className="border-l-2 border-site-action bg-site-canvas-alt p-4">
                <p className="site-eyebrow">2. Watch interest</p>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  Start with the proof section and use the first-view loop below to see when interest is real.
                </p>
              </div>
              <div className="border-l-2 border-site-action bg-site-canvas-alt p-4">
                <p className="site-eyebrow">3. Adjust for the moment</p>
                <p className="mt-2 text-sm leading-6 text-site-secondary">
                  {variants.length > 0
                    ? `You already have ${variants.length} targeted ${variants.length === 1 ? "version" : "versions"} ready. Use the one that matches the next conversation.`
                    : "Add a targeted version after your first send so your next outreach matches the exact audience."}
                </p>
              </div>
            </div>
            {jobSeekerSummary ? (
              <p className="mt-4 text-sm leading-6 text-site-secondary">
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
              className="site-button site-button-secondary"
            >
              Open your page
            </Link>
            {publishedPageId ? (
              <>
                {accountAccess.analyticsTier === "full" ? (
                  <Link
                    href={`/dashboard/analytics/${publishedPageId}`}
                    className="site-button site-button-secondary"
                  >
                    Open page analytics
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="site-button site-button-secondary"
                  >
                    Open dashboard
                  </Link>
                )}
                <Link
                  href={`/dashboard/edit/${publishedPageId}/living-page`}
                  className="site-button site-button-secondary"
                >
                  Edit page
                </Link>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

    </main>
  );
}
