import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  buildAutoOptimizedAtsCandidate,
  createRuleBasedAtsReview,
  normalizeAtsText,
  normalizeResumeDataForAts,
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

    const review = createRuleBasedAtsReview({
      data: normalized,
      targeting: body.targeting,
      exportCheck,
      candidateResumeData: candidate.candidateResumeData,
      candidateExportCheck: candidate.candidateExportCheck,
      changeSummary: candidate.changeSummary,
      status: candidate.status,
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
