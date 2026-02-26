"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ResumeLayout from "@/components/ResumeLayout";
import ThemeCanvas from "@/components/ThemeCanvas";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { usernameFromEmail } from "@/lib/usernames";
import { THEME_REGISTRY } from "@/themes/registry";
import type { ThemeId } from "@/themes/types";
import type { ResumeData } from "@/types/resume";

type Step = "input" | "theme" | "processing" | "preview";

const STAGES = [
  "Analyzing resume structure...",
  "Extracting experience data...",
  "Identifying skills and certifications...",
  "Structuring professional profile...",
  "Finalizing JSON output...",
];

const PREVIEW_THEMES: ThemeId[] = ["cosmic", "fluid", "ember", "monolith", "aurora", "terracotta"];

const SAMPLE_RESUME = `RAY
Attorney & Technology Entrepreneur
New York, NY | ray@email.com | linkedin.com/in/ray

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

EDUCATION
Juris Doctor — Law School, 2023

SKILLS
Legal Tech, SaaS Development, EdTech, UI/UX Design, Gamification, Canvas 2D, Product Design

CERTIFICATIONS
New York State Bar (Licensed)
Florida Bar (February 2026)`;

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

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [resumeText, setResumeText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("cosmic");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  const [error, setError] = useState("");
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [publishing, setPublishing] = useState(false);

  const themes = useMemo(() => THEME_REGISTRY.filter((theme) => PREVIEW_THEMES.includes(theme.id)), []);

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
              setParsedData(payload.data as ResumeData);
              setProgress(100);
              setStage("Done!");
              setStep("preview");
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

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle<{ username: string }>();

      const derivedUsername = usernameFromEmail(user.email);
      const username = existingProfile?.username ?? derivedUsername;

      if (!existingProfile) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            username,
            email: user.email,
          },
          { onConflict: "id" },
        );
      }

      const { data: savedPage, error: saveError } = await supabase
        .from("pages")
        .upsert(
          {
            user_id: user.id,
            slug: username,
            status: "live",
            theme_id: selectedTheme,
            resume_data: parsedData,
            raw_resume: resumeText,
            page_config: {},
            published_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,slug",
          },
        )
        .select("slug")
        .single<{ slug: string }>();

      if (saveError) {
        throw saveError;
      }

      router.push(`/${savedPage?.slug ?? username}`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to publish page.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4A654]">Create Flow</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-[#F5F0EB]">Generate Your Living Page</h1>
        </div>
        <div className="hidden gap-2 md:flex">
          {(["input", "theme", "processing", "preview"] as Step[]).map((id, index) => {
            const currentIndex = ["input", "theme", "processing", "preview"].indexOf(step);
            return (
              <span
                key={id}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: currentIndex >= index ? 34 : 24,
                  background:
                    currentIndex >= index
                      ? "linear-gradient(90deg, #D4A654, #F0D48A)"
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

      {step === "input" ? (
        <section className="glass-card rounded-2xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4A654]">Step 1</p>
          <h2 className="mt-2 font-heading text-3xl font-bold">Paste resume text</h2>
          <p className="mt-2 text-sm text-[rgba(245,240,235,0.55)]">Drop your full resume text and continue to theme selection.</p>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste your resume text here..."
            className="mt-5 min-h-[320px] w-full rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] p-5 font-mono text-sm leading-7 text-[#F5F0EB] placeholder:text-[rgba(245,240,235,0.3)] focus:border-[#D4A654] focus:outline-none"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[rgba(245,240,235,0.35)]">
            <p>
              {resumeText.length.toLocaleString()} characters · {resumeText.split(/\n/).length} lines
            </p>
            <button
              type="button"
              onClick={() => setResumeText(SAMPLE_RESUME)}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(245,240,235,0.6)] hover:border-[rgba(212,166,84,0.35)] hover:text-[#F0D48A]"
            >
              Load Sample
            </button>
          </div>
          <button
            type="button"
            disabled={!resumeText.trim()}
            onClick={() => setStep("theme")}
            className="gold-pill mt-6 h-12 px-7 text-sm font-semibold transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(212,166,84,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to Theme Selection
          </button>
        </section>
      ) : null}

      {step === "theme" ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#D4A654]">Step 2</p>
            <h2 className="mt-2 font-heading text-3xl font-bold">Pick your living theme</h2>
            <p className="mt-2 text-sm text-[rgba(245,240,235,0.55)]">Each option is rendered live on Canvas.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className="glass-card rounded-2xl p-3 text-left transition-all duration-300 ease-soft hover:-translate-y-1"
                style={{
                  borderColor: selectedTheme === theme.id ? "rgba(212,166,84,0.38)" : "rgba(255,255,255,0.08)",
                  background: selectedTheme === theme.id ? "rgba(212,166,84,0.07)" : "rgba(255,255,255,0.03)",
                }}
              >
                <ThemeCanvas themeId={theme.id} height={120} />
                <p className="mt-3 font-heading text-xl">{theme.name}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#D4A654]">{theme.vibe}</p>
                <p className="mt-2 text-xs leading-6 text-[rgba(245,240,235,0.45)]">{theme.description}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("input")}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(245,240,235,0.7)] hover:border-[rgba(212,166,84,0.35)] hover:text-[#F0D48A]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={startProcessing}
              className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(212,166,84,0.35)]"
            >
              Generate My Living Page
            </button>
          </div>
        </section>
      ) : null}

      {step === "processing" ? (
        <section className="glass-card mx-auto max-w-xl rounded-2xl p-8 text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-2 border-[rgba(212,166,84,0.2)] border-t-[#D4A654]" />
          <h2 className="mt-6 font-heading text-3xl font-bold">Bringing You to Life</h2>
          <p className="mt-2 text-sm text-[#D4A654]">{stage}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D4A654] to-[#F0D48A] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 font-mono text-xs text-[rgba(245,240,235,0.4)]">{progress}%</p>
        </section>
      ) : null}

      {step === "preview" && parsedData ? (
        <section>
          <div className="mb-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#D4A654]">Step 4</p>
            <h2 className="mt-2 font-heading text-3xl font-bold">Preview and publish</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[rgba(212,166,84,0.18)]">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.35)] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              <div className="ml-3 rounded-md bg-[rgba(255,255,255,0.06)] px-3 py-1 font-mono text-[11px] text-[rgba(245,240,235,0.5)]">
                mylivingpage.com/<span className="text-[#F0D48A]">{parsedData.name.toLowerCase().replace(/\s+/g, "-")}</span>
              </div>
            </div>
            <ThemeCanvas themeId={selectedTheme} height={620} className="rounded-none">
              <div className="h-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.55)_100%)]">
                <ResumeLayout data={parsedData} />
              </div>
            </ThemeCanvas>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("theme")}
              className="rounded-full border border-[rgba(255,255,255,0.15)] px-6 py-3 text-xs uppercase tracking-[0.16em] text-[rgba(245,240,235,0.7)] hover:border-[rgba(212,166,84,0.35)] hover:text-[#F0D48A]"
            >
              Change Theme
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={publishPage}
              className="gold-pill px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-soft hover:shadow-[0_10px_36px_rgba(212,166,84,0.35)] disabled:opacity-60"
            >
              {publishing ? "Publishing..." : "Publish and Go Live"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
