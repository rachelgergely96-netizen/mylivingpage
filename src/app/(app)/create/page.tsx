"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AtsReviewPanel from "@/components/ats/AtsReviewPanel";
import GuidedFlow from "@/components/create/GuidedFlow";
import DraftBanner from "@/components/DraftBanner";
import ResumeLayout from "@/components/ResumeLayout";
import ThemePicker from "@/components/ThemePicker";
import ThemeCanvas from "@/components/ThemeCanvas";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { getDefaultAtsTargeting, mergeResumePatch } from "@/lib/ats-review";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { usernameFromEmail } from "@/lib/usernames";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type { AtsReviewSnapshot, AtsSuggestion, AtsTargeting, ResumeData } from "@/types/resume";
import { MAX_PAGES_PER_ACCOUNT, isPremiumPlan } from "@/lib/plans";

type Step = "input" | "review" | "theme" | "processing" | "preview";
type InputMode = "choose" | "paste" | "guided";
type EntryPreference = "resume-first" | "page-first" | "neutral";
const PROGRESS_STEPS: Array<Exclude<Step, "processing">> = ["input", "review", "theme", "preview"];

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

const STAGES = [
  "Analyzing resume structure...",
  "Extracting experience data...",
  "Identifying skills and certifications...",
  "Structuring professional profile...",
  "Finalizing JSON output...",
];

const SAMPLE_RESUME = `RAY
Attorney & Technology Entrepreneur
New York, NY | ray@email.com | linkedin.com/in/ray | github.com/ray-dev

SUMMARY
Licensed attorney in New York building at the intersection of law and technology. Creator of multiple tech ventures including BarPrepPlay (275+ users), LiveCardStudio, and ReadyToClose.

EXPERIENCE
Founder & CEO — BarPrepPlay
2024 – Present
- Built gamified bar exam preparation platform from scratch
- Grew to 275+ active users generating passive revenue

Founder — LiveCardStudio
2025 – Present
- Created living greeting card platform with procedural Canvas 2D graphics
- Engineered particle systems, synthesized audio, and animated themes

PROJECTS
BarPrepPlay — Gamified bar exam prep platform with spaced repetition and adaptive question pools. Built with Next.js, Supabase, and Stripe.
LiveCardStudio — Living greeting card platform featuring procedural Canvas 2D animations, particle systems, and synthesized audio.
ReadyToClose — Real estate closing management tool streamlining document preparation and scheduling.

EDUCATION
Juris Doctor — Law School, 2023

SKILLS
Languages: TypeScript, Python, SQL
Frameworks: Next.js, React, Tailwind CSS
Tools: Supabase, Stripe, Vercel, Figma
Domains: Legal Tech, SaaS, EdTech, UI/UX Design

CERTIFICATIONS
New York State Bar — New York State, Licensed 2023
Florida Bar — The Florida Bar, February 2026`;

function parseSseChunk(chunk: string, onMessage: (payload: { type: string; [key: string]: unknown }) => void) {
  const events = chunk.split("\n\n");
  const remainder = events.pop() ?? "";
  events.forEach((event) => {
    const dataLine = event
      .split("\n")
      .find((line) => line.startsWith("data:"))
      ?.slice(5)
      .trim();
    if (!dataLine) {
      return;
    }
    try {
      onMessage(JSON.parse(dataLine) as { type: string; [key: string]: unknown });
    } catch {
      // Ignore malformed stream fragments.
    }
  });
  return remainder;
}

function getEntryPreference(referrer: string | null): EntryPreference {
  if (!referrer) {
    return "neutral";
  }

  const value = referrer.toLowerCase();

  if (
    value.includes("example") ||
    value.includes("recruiter_click") ||
    value.includes("referral") ||
    value.includes("after_click")
  ) {
    return "page-first";
  }

  if (
    value.includes("ats") ||
    value.includes("keyword") ||
    value.includes("self_test") ||
    value.includes("apply")
  ) {
    return "resume-first";
  }

  return "neutral";
}

function getCreateIntro(referrer: string | null) {
  const preference = getEntryPreference(referrer);

  if (preference === "resume-first") {
    return {
      heading: "Start from the ATS-safe resume you already use.",
      body: "You came from ATS or search guidance, so paste mode is recommended first. Keep the application resume intact, then turn it into the page people read after the click.",
      recommendedMode: "paste" as const,
    };
  }

  if (preference === "page-first") {
    return {
      heading: "Start from the page you want people to open.",
      body: "You came from sample pages or follow-up content, so guided mode is recommended first. Shape the human click without replacing the resume you still use for applications.",
      recommendedMode: "guided" as const,
    };
  }

  return {
    heading: "How would you like to start?",
    body: "Start from the resume you already use for applications, then turn it into a page people can scan faster once they click.",
    recommendedMode: "paste" as const,
  };
}

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState<InputMode>("choose");
  const [guidedData, setGuidedData] = useState<Partial<ResumeData>>({
    name: "", headline: "", location: "", email: null,
    linkedin: null, github: null, website: null, avatar_url: null,
    summary: "", experience: [], education: [], projects: [],
    skills: [{ category: "General", items: [] }],
    certifications: [], stats: [],
  });
  const [resumeText, setResumeText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("cosmic");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  const [error, setError] = useState("");
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const guidedModeRef = useRef(false);
  const [signupReferrer, setSignupReferrer] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("spark");
  const [pageCount, setPageCount] = useState<number>(0);
  const premium = isPremiumPlan(userPlan);
  const atPageLimit = pageCount >= MAX_PAGES_PER_ACCOUNT;
  const queryReferrer = searchParams.get("ref");
  const activeReferrer = queryReferrer ?? signupReferrer;
  const createIntro = useMemo(() => getCreateIntro(activeReferrer), [activeReferrer]);
  const inputOptions = useMemo(() => {
    const pasteOption = {
      mode: "paste" as const,
      icon: "◈",
      title: "Paste Resume",
      body: "Paste the ATS-safe resume you already use and let AI structure it for the page people read after the click.",
      duration: "Quick — ~2 min",
    };
    const guidedOption = {
      mode: "guided" as const,
      icon: "✦",
      title: "Build It Together",
      body: "Answer a few prompts and shape a page recruiters and hiring managers can understand faster once they click.",
      duration: "Guided — ~5 min",
    };

    return createIntro.recommendedMode === "guided"
      ? [guidedOption, pasteOption]
      : [pasteOption, guidedOption];
  }, [createIntro.recommendedMode]);

  // Draft persistence
  const { pendingDraft, saveDraft, clearDraft, dismissDraft } = useLocalDraft<CreateDraft>("mlp-draft-create");
  const isDirty = resumeText.length > 0 || (guidedData.name ?? "").length > 0 || selectedTheme !== "cosmic";
  useUnsavedChanges(isDirty && step !== "processing");

  // Save draft on changes (skip during processing/preview)
  useEffect(() => {
    if (step === "processing" || step === "preview") return;
    if (!isDirty) return;
    saveDraft({ resumeText, guidedData, parsedData, selectedTheme, inputMode, step, atsTargeting, atsReview });
  }, [resumeText, guidedData, parsedData, selectedTheme, inputMode, step, isDirty, saveDraft, atsTargeting, atsReview]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    const d = pendingDraft.data;
    setResumeText(d.resumeText ?? "");
    setGuidedData(d.guidedData ?? { name: "", headline: "", location: "", email: null, linkedin: null, github: null, website: null, avatar_url: null, summary: "", experience: [], education: [], projects: [], skills: [{ category: "General", items: [] }], certifications: [], stats: [] });
    setParsedData(d.parsedData ?? null);
    setSelectedTheme(d.selectedTheme ?? "cosmic");
    setInputMode(d.inputMode ?? "choose");
    setAtsTargeting(d.atsTargeting ?? { primaryTitle: "", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] });
    setAtsReview(d.atsReview ?? null);
    guidedModeRef.current = d.inputMode === "guided";
    if (d.step === "review" || d.step === "theme") setStep(d.step);
    dismissDraft();
  }, [pendingDraft, dismissDraft]);

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

  // Fetch user plan and page count on mount
  useEffect(() => {
    const fetchPlanInfo = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [profileRes, pagesRes] = await Promise.all([
          supabase.from("profiles").select("plan, username, signup_referrer").eq("id", user.id).maybeSingle(),
          supabase.from("pages").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},owner_id.eq.${user.id}`),
        ]);
        setUserPlan(profileRes.data?.plan ?? "spark");
        setPublicSlug(profileRes.data?.username ?? usernameFromEmail(user.email));
        setSignupReferrer(profileRes.data?.signup_referrer ?? null);
        setPageCount(pagesRes.count ?? 0);
      } catch { /* ignore */ }
    };
    fetchPlanInfo();
  }, []);

  useEffect(() => {
    const fetchReferrer = async () => {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) {
          return;
        }
        const profile = (await response.json()) as { signup_referrer?: string | null };
        setSignupReferrer(profile.signup_referrer ?? null);
      } catch {
        // Ignore.
      }
    };

    if (!queryReferrer) {
      void fetchReferrer();
    }
  }, [queryReferrer]);

  const handleInputModeSelect = (mode: Extract<InputMode, "paste" | "guided">) => {
    setInputMode(mode);
    guidedModeRef.current = mode === "guided";
    void trackCreateEvent("create.mode_selected", {
      mode,
      source_ref: activeReferrer,
      recommended_mode: createIntro.recommendedMode,
    });
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      setParsedData((prev) => prev ? { ...prev, avatar_url: data.url! } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    await fetch("/api/avatar", { method: "DELETE" });
    setParsedData((prev) => prev ? { ...prev, avatar_url: null } : prev);
  };

  const runAtsReview = useCallback(
    async (
      overrideData?: ResumeData,
      overrideTargeting?: AtsTargeting,
      appliedSuggestionIds?: string[],
    ) => {
      const data = overrideData ?? parsedData;
      const targeting = overrideTargeting ?? atsTargeting;
      if (!data) {
        return;
      }

      setReviewingAts(true);
      setError("");
      try {
        const response = await fetch("/api/generate/ats-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeData: data,
            rawResume: resumeText,
            targeting,
            appliedSuggestionIds: appliedSuggestionIds ?? atsReview?.appliedSuggestionIds ?? [],
          }),
        });

        if (response.status === 401) {
          router.push("/login?next=/create");
          return;
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

        const result = payload as AtsReviewSnapshot;

        setAtsTargeting(result.targeting);
        setAtsReview(result);
        void trackCreateEvent("ats.review.run", {
          issues: result.issues.length,
          source_ref: activeReferrer,
          fits_one_page: result.exportCheck.fitsOnOnePage,
        });
      } catch (reviewError) {
        setError(reviewError instanceof Error ? reviewError.message : "Unable to review ATS searchability.");
      } finally {
        setReviewingAts(false);
      }
    },
    [activeReferrer, atsReview?.appliedSuggestionIds, atsTargeting, parsedData, resumeText, router, trackCreateEvent],
  );

  const applySuggestion = useCallback(
    (suggestion: AtsSuggestion) => {
      if (!parsedData) {
        return;
      }

      const nextData = mergeResumePatch(parsedData, suggestion.applyData);
      const nextAppliedIds = Array.from(new Set([...(atsReview?.appliedSuggestionIds ?? []), suggestion.id]));
      setParsedData(nextData);
      void trackCreateEvent("ats.suggestion.applied", {
        suggestion_id: suggestion.id,
        source_ref: activeReferrer,
      });
      void runAtsReview(nextData, atsTargeting, nextAppliedIds);
    },
    [activeReferrer, atsReview?.appliedSuggestionIds, atsTargeting, parsedData, runAtsReview, trackCreateEvent],
  );

  const startProcessing = async () => {
    setError("");
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
        const fallback = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(fallback?.error ?? "Could not start resume processing.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          buffer = parseSseChunk(buffer, (payload) => {
            if (payload.type === "progress") {
              if (typeof payload.progress === "number") {
                setProgress(Math.max(0, Math.min(99, payload.progress)));
              }
              if (typeof payload.stage === "string") {
                setStage(payload.stage);
              }
            }
            if (payload.type === "result") {
              const nextData = payload.data as ResumeData;
              const nextTargeting = getDefaultAtsTargeting(nextData);
              setParsedData(nextData);
              setAtsTargeting(nextTargeting);
              setAtsReview(null);
              setProgress(100);
              setStage("Done!");
              setStep("review");
              void runAtsReview(nextData, nextTargeting, []);
            }
            if (payload.type === "error") {
              throw new Error(typeof payload.message === "string" ? payload.message : "AI parsing failed.");
            }
          });
        }
      }
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : "Unable to process resume.");
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

      const res = await fetch("/api/pages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsedData.name || "My Living Page",
          theme_id: selectedTheme,
          resume_data: parsedData,
          raw_resume: resumeText,
          page_config: { ats: atsReview },
        }),
      });

      const result = (await res.json()) as { slug?: string; error?: string };
      if (!res.ok) {
        throw new Error(result.error ?? "Publish failed.");
      }

      await trackCreateEvent("create.completed", {
        source_ref: activeReferrer,
        input_mode: guidedModeRef.current ? "guided" : "paste",
        theme_id: selectedTheme,
      });
      clearDraft();
      const nextSlug = result.slug ?? publicSlug ?? usernameFromEmail(user.email);
      setPublicSlug(nextSlug);
      router.push(`/${nextSlug}`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish page.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10">
      <div className="mb-5 sm:mb-7 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Create Flow</p>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[#F0F4FF]">Build Your Living Page</h1>
        </div>
        <div className="hidden gap-2 md:flex">
          {PROGRESS_STEPS.map((id, index) => {
            const progressStep = step === "processing" ? "review" : step;
            const currentIndex = PROGRESS_STEPS.indexOf(progressStep as Exclude<Step, "processing">);
            return (
              <span
                key={id}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: currentIndex >= index ? 34 : 24,
                  background:
                    currentIndex >= index
                      ? "linear-gradient(90deg, #3B82F6, #93C5FD)"
                      : "rgba(255,255,255,0.12)",
                }}
              />
            );
          })}
        </div>
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
        <section className="glass-card rounded-2xl p-5 sm:p-8 text-center">
          <p className="text-2xl mb-3">&#x1F512;</p>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#F0F4FF]">Page limit reached</h2>
          <p className="mt-2 text-sm text-[rgba(240,244,255,0.55)]">
            Each account supports {MAX_PAGES_PER_ACCOUNT} public page in v1. Edit your current page, or delete it before creating a replacement.
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

      {!atPageLimit && step === "input" && inputMode === "choose" ? (
        <section className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 1</p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-[#F0F4FF]">{createIntro.heading}</h2>
          <p className="mt-2 mb-6 text-xs sm:text-sm text-[rgba(240,244,255,0.55)]">
            {createIntro.body}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {inputOptions.map((option) => {
              const recommended = option.mode === createIntro.recommendedMode;

              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => handleInputModeSelect(option.mode)}
                  className="group rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-5 sm:p-6 text-left transition-all duration-300 ease-soft hover:-translate-y-1 hover:border-[rgba(59,130,246,0.3)] hover:bg-[rgba(59,130,246,0.05)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="mb-3 text-2xl text-[#3B82F6]">{option.icon}</p>
                    {recommended ? (
                      <span className="rounded-full border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93C5FD]">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-heading text-xl font-bold text-[#F0F4FF]">{option.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-[rgba(240,244,255,0.5)]">{option.body}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[rgba(240,244,255,0.3)] group-hover:text-[#3B82F6] transition-colors">
                    {option.duration}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {!atPageLimit && step === "input" && inputMode === "paste" ? (
        <section className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 1</p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold">Paste resume text</h2>
          <p className="mt-2 text-xs sm:text-sm text-[rgba(240,244,255,0.55)]">
            Paste the resume text you already use for applications, keep that machine-readable source intact, and let us review searchability before you choose the page theme.
          </p>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste your resume text here..."
            className="mt-4 sm:mt-5 min-h-[240px] sm:min-h-[320px] w-full rounded-xl sm:rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] p-4 sm:p-5 font-mono text-xs sm:text-sm leading-6 sm:leading-7 text-[#F0F4FF] placeholder:text-[rgba(240,244,255,0.3)] focus:border-[#3B82F6] focus:outline-none"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[rgba(240,244,255,0.35)]">
            <p>
              {resumeText.length.toLocaleString()} characters · {resumeText.split(/\n/).length} lines
            </p>
            <button
              type="button"
              onClick={() => {
                if (resumeText.trim() && resumeText !== SAMPLE_RESUME) {
                  if (!window.confirm("This will replace your current text with a sample resume. Continue?")) return;
                }
                setResumeText(SAMPLE_RESUME);
              }}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.6)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Load Sample
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setInputMode("choose")}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!resumeText.trim()}
              onClick={startProcessing}
              className="gold-pill h-12 px-7 text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run ATS Review
            </button>
          </div>
        </section>
      ) : null}

      {!atPageLimit && step === "input" && inputMode === "guided" ? (
        <GuidedFlow
          guidedData={guidedData}
          onUpdate={setGuidedData}
          onComplete={(data) => {
            const nextTargeting = getDefaultAtsTargeting(data);
            setParsedData(data);
            setAtsTargeting(nextTargeting);
            setAtsReview(null);
            setStep("review");
            void runAtsReview(data, nextTargeting, []);
          }}
          onBack={() => setInputMode("choose")}
        />
      ) : null}

      {step === "review" && parsedData ? (
        <AtsReviewPanel
          data={parsedData}
          review={atsReview}
          targeting={atsTargeting}
          reviewing={reviewingAts}
          onTargetingChange={setAtsTargeting}
          onRunReview={() => void runAtsReview()}
          onApplySuggestion={applySuggestion}
          onBack={() => setStep("input")}
          onContinue={() => setStep("theme")}
          continueLabel="Continue to Theme Selection"
          backLabel="Back"
          stepLabel="Step 2"
          heading="Review ATS visibility and searchability"
          body="We check whether the exported ATS PDF stays machine-readable, whether your exact titles and skills are easy to find, and whether the resume fits one page before download."
        />
      ) : null}

      {step === "theme" ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 3</p>
            <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold">Pick your living theme</h2>
            <p className="mt-2 text-xs sm:text-sm text-[rgba(240,244,255,0.55)]">
              Choose the page people will open after your resume has already done its machine job.
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.35)]">Your resume input</p>
            <p className="mt-1 truncate font-mono text-xs text-[rgba(240,244,255,0.55)]">
              {resumeText.slice(0, 120)}{resumeText.length > 120 ? "..." : ""}
            </p>
            <p className="mt-1 text-[10px] text-[rgba(240,244,255,0.3)]">
              {resumeText.length.toLocaleString()} characters · {resumeText.split(/\n/).length} lines
            </p>
          </div>
          <ThemePicker
            themes={THEME_REGISTRY}
            selectedThemeId={selectedTheme}
            onSelectTheme={setSelectedTheme}
            premium={premium}
            showDescription
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("review")}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep("preview")}
              disabled={!parsedData}
              className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)]"
            >
              Preview My Living Page
            </button>
          </div>
        </section>
      ) : null}

      {step === "processing" ? (
        <section className="glass-card mx-auto max-w-xl rounded-2xl p-5 sm:p-8 text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-2 border-[rgba(59,130,246,0.2)] border-t-[#3B82F6]" />
          <h2 className="mt-6 font-heading text-2xl sm:text-3xl font-bold">Bringing You to Life</h2>
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

      {step === "preview" && parsedData ? (
        <section>
          <div className="mb-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#3B82F6]">Step 4</p>
            <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold">Preview and publish</h2>
          </div>

          {atsReview ? (
            <div className="mb-4 rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#93C5FD]">ATS status</p>
              <p className="mt-2 text-sm text-[#F0F4FF]">
                {atsReview.exportCheck.fitsOnOnePage
                  ? "Visible to systems, easier to find in recruiter search, and ready for a one-page ATS PDF."
                  : "The living page is ready, but the ATS PDF still needs one-page fixes before export."}
              </p>
            </div>
          ) : null}

          {/* Public URL */}
          <div className="mb-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Public URL</p>
            <div className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 font-mono text-sm text-[#93C5FD]">
              mylivingpage.com/{publicSlug || "your-username"}
            </div>
            <p className="mt-2 text-xs text-[rgba(240,244,255,0.42)]">
              Change this in account settings. This is the page link you can use anywhere a recruiter or hiring manager can click.
            </p>
          </div>

          {/* Avatar Upload */}
          <div className="mb-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-[rgba(240,244,255,0.4)]">Profile Photo</p>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              {parsedData.avatar_url ? (
                <Image
                  src={parsedData.avatar_url}
                  alt="Avatar"
                  width={64}
                  height={64}
                  sizes="(min-width: 640px) 64px, 56px"
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-[#3B82F6] shadow-[0_0_28px_rgba(59,130,246,0.3)] sm:h-16 sm:w-16"
                />
              ) : (
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#E8845C] font-heading text-xl sm:text-2xl font-bold text-[#0a1628] shadow-[0_0_28px_rgba(59,130,246,0.3)]">
                  {(parsedData.name || "?").slice(0, 1).toUpperCase()}
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
                  {uploadingAvatar ? "Uploading..." : parsedData.avatar_url ? "Change Photo" : "Upload Photo"}
                </button>
                {parsedData.avatar_url ? (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="text-xs text-[rgba(240,244,255,0.35)] hover:text-[#ff8e8e]"
                  >
                    Remove &middot; use monogram
                  </button>
                ) : (
                  <p className="text-[10px] text-[rgba(240,244,255,0.3)]">Optional &middot; JPEG, PNG, or WebP under 2 MB</p>
                )}
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
            <ThemeCanvas themeId={selectedTheme} height="min(620px, calc(100dvh - 200px))" className="rounded-none">
              <div className="h-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.55)_100%)]">
                <ResumeLayout data={parsedData} />
              </div>
            </ThemeCanvas>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("theme")}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(240,244,255,0.7)] hover:border-[rgba(59,130,246,0.35)] hover:text-[#93C5FD]"
            >
              Change Theme
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={publishPage}
              className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(59,130,246,0.35)] disabled:opacity-60"
            >
              {publishing ? "Publishing..." : "Publish and Go Live"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
