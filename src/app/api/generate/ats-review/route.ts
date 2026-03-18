import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  buildAutoOptimizedAtsCandidate,
  createRuleBasedAtsReview,
  normalizeAtsText,
  normalizeResumeDataForAts,
  summarizeCandidateChanges,
} from "@/lib/ats-review";
import { checkAtsResumeExport } from "@/lib/pdf/ResumePDFDocument";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import type { AtsReviewMode, AtsSuggestion, AtsTargeting, ResumeData } from "@/types/resume";

export const runtime = "nodejs";
const routeTrustLevel = "authenticated_user";

const MODEL_NAME = "claude-sonnet-4-20250514";

function buildPrompt(data: ResumeData, targeting: AtsTargeting, rawResume: string | null) {
  return `You are improving a resume for ATS readability and recruiter searchability.

Return ONLY valid JSON. Do not include markdown, comments, or extra text.

Rules:
- Never invent qualifications, titles, metrics, tools, or experience.
- Only suggest wording changes that are supported by the existing resume data or raw resume text.
- Keep language plain, credible, and ATS-safe.
- Prefer exact titles, explicit skill names, and natural wording.
- If there is not enough evidence for a suggestion, omit it.
- Limit to at most 4 suggestions.

Return this JSON shape:
{
  "suggestions": [
    {
      "id": "string",
      "category": "machine_readability | recruiter_searchability | one_page_pdf",
      "title": "string",
      "description": "string",
      "applyLabel": "string",
      "preview": "string or empty",
      "applyData": {
        "headline": "string optional",
        "summary": "string optional",
        "experience": [
          {
            "title": "string",
            "company": "string",
            "dates": "string",
            "highlights": ["string"],
            "url": "string or null"
          }
        ],
        "skills": [
          {
            "category": "string",
            "items": ["string"]
          }
        ]
      }
    }
  ]
}

TARGETING:
${JSON.stringify(targeting, null, 2)}

STRUCTURED RESUME:
${JSON.stringify(data, null, 2)}

RAW RESUME TEXT:
${rawResume?.trim() || "N/A"}`;
}

function buildCondensePrompt(
  originalData: ResumeData,
  workingDraft: ResumeData,
  targeting: AtsTargeting,
  rawResume: string | null,
) {
  return `You are creating the strongest possible one-page ATS resume draft from existing user information.

Return ONLY valid JSON. Do not include markdown, comments, or extra text.

Rules:
- Never invent qualifications, titles, metrics, tools, or experience.
- Only use facts supported by the structured resume or raw resume text.
- Keep the draft ATS-safe, plain-language, and credible.
- Preserve contact fields exactly as provided; do not rewrite or remove them.
- Keep the headline and summary if evidence exists.
- Keep education when present.
- Keep at least the two most recent experience entries when available, with at least one bullet each.
- Keep a focused core skills section with no more than 6 total skills.
- Drop or tighten lower-priority details before removing core evidence.
- Aim for a one-page resume, but do not force a result by inventing or distorting facts.

Return this JSON shape:
{
  "candidateResumeData": {
    "headline": "string",
    "summary": "string",
    "experience": [
      {
        "title": "string",
        "company": "string",
        "dates": "string",
        "highlights": ["string"],
        "url": "string or null"
      }
    ],
    "education": [
      {
        "degree": "string",
        "school": "string",
        "year": "string"
      }
    ],
    "projects": [
      {
        "name": "string",
        "description": "string",
        "tech": ["string"],
        "url": "string or null"
      }
    ],
    "skills": [
      {
        "category": "string",
        "items": ["string"]
      }
    ],
    "certifications": [
      {
        "name": "string",
        "issuer": "string or null",
        "date": "string or null"
      }
    ]
  }
}

TARGETING:
${JSON.stringify(targeting, null, 2)}

ORIGINAL STRUCTURED RESUME:
${JSON.stringify(originalData, null, 2)}

CURRENT BEST ATS DRAFT:
${JSON.stringify(workingDraft, null, 2)}

RAW RESUME TEXT:
${rawResume?.trim() || "N/A"}`;
}

function parseJson<T>(value: string): T {
  const clean = value.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Could not parse ATS review JSON.");
    }
    return JSON.parse(match[0]) as T;
  }
}

function sanitizeAiSuggestions(
  suggestions: unknown,
  baseline: ResumeData,
): AtsSuggestion[] {
  if (!Array.isArray(suggestions)) {
    return [];
  }

  const sanitized: Array<AtsSuggestion | null> = suggestions.map((suggestion, index) => {
      if (!suggestion || typeof suggestion !== "object") {
        return null;
      }

      const candidate = suggestion as Record<string, unknown>;
      const applyData = candidate.applyData && typeof candidate.applyData === "object"
        ? (candidate.applyData as Partial<ResumeData>)
        : {};

      const normalizedPatch: Partial<ResumeData> = {};
      if (typeof applyData.headline === "string") {
        normalizedPatch.headline = normalizeAtsText(applyData.headline);
      }
      if (typeof applyData.summary === "string") {
        normalizedPatch.summary = normalizeAtsText(applyData.summary);
      }
      if (Array.isArray(applyData.experience)) {
        normalizedPatch.experience = normalizeResumeDataForAts({
          ...baseline,
          experience: applyData.experience,
        }).experience;
      }
      if (Array.isArray(applyData.skills)) {
        normalizedPatch.skills = normalizeResumeDataForAts({
          ...baseline,
          skills: applyData.skills,
        }).skills;
      }

      if (!Object.keys(normalizedPatch).length) {
        return null;
      }

      return {
        id: typeof candidate.id === "string" ? candidate.id : `ai-suggestion-${index + 1}`,
        category:
          candidate.category === "machine_readability" ||
          candidate.category === "recruiter_searchability" ||
          candidate.category === "one_page_pdf"
            ? candidate.category
            : "recruiter_searchability",
        title: typeof candidate.title === "string" ? normalizeAtsText(candidate.title) : "Suggested update",
        description:
          typeof candidate.description === "string"
            ? normalizeAtsText(candidate.description)
            : "A suggested ATS-safe wording update based on the current content.",
        applyLabel:
          typeof candidate.applyLabel === "string"
            ? normalizeAtsText(candidate.applyLabel)
            : "Apply suggestion",
        preview: typeof candidate.preview === "string" ? normalizeAtsText(candidate.preview) : "",
        expectedIssueIds: [],
        expectedScoreDimensions: [],
        applyData: normalizedPatch,
        source: "ai",
      } satisfies AtsSuggestion;
    });

  return sanitized.filter((suggestion): suggestion is AtsSuggestion => suggestion !== null);
}

function countSkillItems(data: ResumeData) {
  return data.skills.reduce((count, group) => count + group.items.length, 0);
}

function preservesAtsFloor(candidate: ResumeData, original: ResumeData) {
  if (original.headline.trim() && !candidate.headline.trim()) {
    return false;
  }

  if (original.summary.trim() && !candidate.summary.trim()) {
    return false;
  }

  const minimumRoles = Math.min(original.experience.length, 2);
  if (candidate.experience.length < minimumRoles) {
    return false;
  }

  if (candidate.experience.some((entry) => entry.highlights.length < 1)) {
    return false;
  }

  if (original.education.length > 0 && candidate.education.length < 1) {
    return false;
  }

  const originalSkillCount = countSkillItems(original);
  const candidateSkillCount = countSkillItems(candidate);
  if (originalSkillCount > 0 && candidateSkillCount < Math.min(originalSkillCount, 3)) {
    return false;
  }

  if (candidateSkillCount > 6) {
    return false;
  }

  return true;
}

function sanitizeAiCondensedCandidate(
  value: unknown,
  baseline: ResumeData,
  original: ResumeData,
) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ResumeData>;
  const normalized = normalizeResumeDataForAts({
    ...baseline,
    headline: typeof candidate.headline === "string" ? candidate.headline : baseline.headline,
    summary: typeof candidate.summary === "string" ? candidate.summary : baseline.summary,
    experience: Array.isArray(candidate.experience) ? candidate.experience : baseline.experience,
    education: Array.isArray(candidate.education) ? candidate.education : baseline.education,
    projects: Array.isArray(candidate.projects) ? candidate.projects : baseline.projects,
    skills: Array.isArray(candidate.skills) ? candidate.skills : baseline.skills,
    certifications: Array.isArray(candidate.certifications) ? candidate.certifications : baseline.certifications,
  });

  return preservesAtsFloor(normalized, original) ? normalized : null;
}

function improvesAtsFit(
  nextExportCheck: { fitsOnOnePage: boolean; pageCount: number },
  currentExportCheck: { fitsOnOnePage: boolean; pageCount: number },
) {
  if (nextExportCheck.fitsOnOnePage && !currentExportCheck.fitsOnOnePage) {
    return true;
  }

  return nextExportCheck.pageCount < currentExportCheck.pageCount;
}

export async function POST(request: Request) {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      resumeData?: ResumeData;
      rawResume?: string | null;
      targeting?: Partial<AtsTargeting>;
      appliedSuggestionIds?: string[];
      mode?: AtsReviewMode;
    };

    if (!body.resumeData) {
      return NextResponse.json({ error: "resumeData is required." }, { status: 400 });
    }

    const normalized = normalizeResumeDataForAts(body.resumeData);
    const exportCheck = await checkAtsResumeExport(normalized);
    const mode: AtsReviewMode = body.mode === "fast" ? "fast" : "full";
    const resolvedTargeting: AtsTargeting = {
      primaryTitle: normalizeAtsText(body.targeting?.primaryTitle ?? normalized.headline),
      titleVariants: (body.targeting?.titleVariants ?? []).map((item) => normalizeAtsText(item)).filter(Boolean),
      jobDescription: body.targeting?.jobDescription ?? "",
      lastExtractedKeywords: [],
    };
    let aiSuggestions: AtsSuggestion[] = [];
    let recommendedSource: "rules" | "ai" = "rules";

    if (mode === "full") {
      try {
        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: MODEL_NAME,
          max_tokens: 1800,
          messages: [
            {
              role: "user",
              content: buildPrompt(normalized, resolvedTargeting, body.rawResume ?? null),
            },
          ],
        });

        const text = response.content
          .map((block) => ("text" in block ? block.text : ""))
          .join("");
        const parsed = parseJson<{ suggestions?: unknown }>(text);
        aiSuggestions = sanitizeAiSuggestions(parsed.suggestions, normalized);
      } catch {
        aiSuggestions = [];
      }
    }

    const candidate = await buildAutoOptimizedAtsCandidate({
      data: normalized,
      targeting: resolvedTargeting,
      checkExport: checkAtsResumeExport,
    });
    let finalCandidate = candidate;

    if (mode === "full" && !candidate.candidateExportCheck.fitsOnOnePage) {
      try {
        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: MODEL_NAME,
          max_tokens: 2200,
          messages: [
            {
              role: "user",
              content: buildCondensePrompt(
                normalized,
                candidate.candidateResumeData,
                resolvedTargeting,
                body.rawResume ?? null,
              ),
            },
          ],
        });

        const text = response.content
          .map((block) => ("text" in block ? block.text : ""))
          .join("");
        const parsed = parseJson<{ candidateResumeData?: unknown; resumeData?: unknown }>(text);
        const aiCandidateResumeData = sanitizeAiCondensedCandidate(
          parsed.candidateResumeData ?? parsed.resumeData,
          candidate.candidateResumeData,
          normalized,
        );

        if (aiCandidateResumeData) {
          const aiCandidateExportCheck = await checkAtsResumeExport(aiCandidateResumeData);
          if (improvesAtsFit(aiCandidateExportCheck, candidate.candidateExportCheck)) {
            finalCandidate = {
              candidateResumeData: aiCandidateResumeData,
              candidateExportCheck: aiCandidateExportCheck,
              changeSummary: summarizeCandidateChanges(normalized, aiCandidateResumeData),
              status: aiCandidateExportCheck.fitsOnOnePage ? ("ready" as const) : ("needs_attention" as const),
            };
            recommendedSource = "ai";
          }
        }
      } catch {
        recommendedSource = "rules";
      }
    }

    const review = createRuleBasedAtsReview({
      data: normalized,
      targeting: resolvedTargeting,
      exportCheck,
      candidateResumeData: finalCandidate.candidateResumeData,
      candidateExportCheck: finalCandidate.candidateExportCheck,
      changeSummary: finalCandidate.changeSummary,
      status: finalCandidate.status,
      appliedSuggestionIds: body.appliedSuggestionIds,
      aiSuggestions,
      mode,
    });

    await trackEvent(user.id, "ats.review.run", {
      mode,
      issues: review.issues.length,
      suggestions: review.suggestions.length,
      proposals: review.proposals.length,
      fits_one_page: review.candidateExportCheck?.fitsOnOnePage ?? review.exportCheck.fitsOnOnePage,
      job_description: Boolean(review.targeting.jobDescription),
      recommended_source: recommendedSource,
      rules_fit_one_page: candidate.candidateExportCheck.fitsOnOnePage,
    });

    return NextResponse.json(review);
  } catch (error) {
    await trackEvent(user.id, "ats.review.failed", {
      error: error instanceof Error ? error.message : "ATS review failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ATS review failed." },
      { status: 400 },
    );
  }
}
