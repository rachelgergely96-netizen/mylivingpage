import { NextResponse } from "next/server";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";
import { getAnthropicClient } from "@/lib/anthropic";
import type { CreateFlowFailureCode } from "@/lib/create-flow";
import { getParseRateLimitWindowStart, isParseRateLimited } from "@/lib/parse-rate-limit";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";
const routeTrustLevel = "authenticated_user";

const MODEL_NAME = "claude-sonnet-4-20250514";
const MAX_PARSE_TOKENS = 2600;

const STAGES = [
  { progress: 10, label: "Analyzing resume structure..." },
  { progress: 25, label: "Extracting experience data..." },
  { progress: 45, label: "Identifying skills and certifications..." },
  { progress: 65, label: "Structuring professional profile..." },
  { progress: 80, label: "Finalizing JSON output..." },
];

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class ParseFailure extends Error {
  code: CreateFlowFailureCode;
  retryable: boolean;
  stage: "request" | "preflight" | "rate_limit" | "ai_request" | "validation";
  status: number;
  metadata: Record<string, unknown>;

  constructor(input: {
    code: CreateFlowFailureCode;
    message: string;
    retryable: boolean;
    stage: "request" | "preflight" | "rate_limit" | "ai_request" | "validation";
    status?: number;
    metadata?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "ParseFailure";
    this.code = input.code;
    this.retryable = input.retryable;
    this.stage = input.stage;
    this.status = input.status ?? 503;
    this.metadata = input.metadata ?? {};
  }
}

function buildPrompt(resumeText: string) {
  return `Parse this resume into structured JSON. Return ONLY valid JSON with no markdown backticks, no preamble, no explanation. Just the raw JSON object.

The JSON must have exactly this structure:
{
  "name": "string",
  "headline": "string (professional title/tagline)",
  "location": "string",
  "email": "string or null",
  "linkedin": "string or null",
  "github": "string or null",
  "website": "string or null",
  "summary": "string (2-3 sentence professional summary)",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "dates": "string",
      "highlights": ["string", "string"],
      "url": "string or null (company website URL if mentioned)"
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
      "description": "string (1-2 sentence summary of the project)",
      "tech": ["string (technologies used)"],
      "url": "string or null"
    }
  ],
  "skills": [
    {
      "category": "string (e.g. Languages, Frameworks, Tools, Soft Skills)",
      "items": ["string"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null (issuing organization)",
      "date": "string or null (date obtained or expected)"
    }
  ],
  "stats": [
    { "value": "string", "label": "string" }
  ]
}

Rules:
- For "stats", extract 3-4 impressive quantitative highlights from the resume (like years of experience, number of users, number of ventures, etc). Make the "value" short and punchy.
- For "projects", extract any personal projects, side projects, or open-source work mentioned. If none are mentioned, return an empty array.
- For "skills", group related skills into 2-5 categories. Common categories: Languages, Frameworks, Tools, Platforms, Soft Skills, etc.
- For "certifications", include the issuing body and date if available. If none are mentioned, return an empty array.
- For "github", extract a GitHub URL/username if present, otherwise null.

RESUME TEXT:
${resumeText}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string) {
  if (typeof record[key] !== "string") {
    throw new ParseFailure({
      code: "schema_invalid",
      message: `Resume parsing returned an invalid "${key}" field. Try again in a moment.`,
      retryable: true,
      stage: "validation",
      metadata: { field: key },
    });
  }

  return record[key];
}

function requireNullableString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }

  throw new ParseFailure({
    code: "schema_invalid",
    message: `Resume parsing returned an invalid "${key}" field. Try again in a moment.`,
    retryable: true,
    stage: "validation",
    metadata: { field: key },
  });
}

function requireStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ParseFailure({
      code: "schema_invalid",
      message: `Resume parsing returned an invalid "${key}" field. Try again in a moment.`,
      retryable: true,
      stage: "validation",
      metadata: { field: key },
    });
  }

  return value;
}

function requireObjectArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => !isObject(item))) {
    throw new ParseFailure({
      code: "schema_invalid",
      message: `Resume parsing returned an invalid "${key}" section. Try again in a moment.`,
      retryable: true,
      stage: "validation",
      metadata: { field: key },
    });
  }

  return value as Array<Record<string, unknown>>;
}

function validateResumeData(payload: unknown): ResumeData {
  if (!isObject(payload)) {
    throw new ParseFailure({
      code: "schema_invalid",
      message: "Resume parsing returned an incomplete result. Try again in a moment.",
      retryable: true,
      stage: "validation",
    });
  }

  return {
    name: requireString(payload, "name"),
    headline: requireString(payload, "headline"),
    location: requireString(payload, "location"),
    email: requireNullableString(payload, "email"),
    linkedin: requireNullableString(payload, "linkedin"),
    github: requireNullableString(payload, "github"),
    website: requireNullableString(payload, "website"),
    avatar_url: null,
    summary: requireString(payload, "summary"),
    experience: requireObjectArray(payload, "experience").map((entry) => ({
      title: requireString(entry, "title"),
      company: requireString(entry, "company"),
      dates: requireString(entry, "dates"),
      highlights: requireStringArray(entry, "highlights"),
      url: requireNullableString(entry, "url"),
    })),
    education: requireObjectArray(payload, "education").map((entry) => ({
      degree: requireString(entry, "degree"),
      school: requireString(entry, "school"),
      year: requireString(entry, "year"),
    })),
    projects: requireObjectArray(payload, "projects").map((entry) => ({
      name: requireString(entry, "name"),
      description: requireString(entry, "description"),
      tech: requireStringArray(entry, "tech"),
      url: requireNullableString(entry, "url"),
    })),
    skills: requireObjectArray(payload, "skills").map((entry) => ({
      category: requireString(entry, "category"),
      items: requireStringArray(entry, "items"),
    })),
    certifications: requireObjectArray(payload, "certifications").map((entry) => ({
      name: requireString(entry, "name"),
      issuer: requireNullableString(entry, "issuer"),
      date: requireNullableString(entry, "date"),
    })),
    stats: requireObjectArray(payload, "stats").map((entry) => ({
      value: requireString(entry, "value"),
      label: requireString(entry, "label"),
    })),
  };
}

function parseAnthropicJson(rawText: string, stopReason: Message["stop_reason"]): ResumeData {
  const clean = rawText.replace(/```json|```/g, "").trim();
  const parseJson = (value: string) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  };

  const direct = parseJson(clean);
  if (direct !== null) {
    return validateResumeData(direct);
  }

  try {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      const recovered = parseJson(match[0]);
      if (recovered !== null) {
        return validateResumeData(recovered);
      }
    }
  } catch {
    // Fall through to the structured failure below.
  }

  if (stopReason === "max_tokens") {
    throw new ParseFailure({
      code: "model_truncated",
      message: "The AI parser returned an incomplete draft. Try again in a moment.",
      retryable: true,
      stage: "validation",
      metadata: { stop_reason: stopReason },
    });
  }

  throw new ParseFailure({
    code: "invalid_json",
    message: "The AI parser returned malformed output. Try again in a moment.",
    retryable: true,
    stage: "validation",
    metadata: { stop_reason: stopReason },
  });
}

function sse(payload: Record<string, unknown>) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function normalizeParseFailure(error: unknown) {
  if (error instanceof ParseFailure) {
    return error;
  }

  const message = error instanceof Error ? error.message.trim() : String(error ?? "").trim();
  const lower = message.toLowerCase();

  if (lower.includes("limit reached")) {
    return new ParseFailure({
      code: "rate_limited",
      message,
      retryable: false,
      stage: "rate_limit",
      status: 429,
    });
  }

  if (
    lower.includes("anthropic_api_key") ||
    lower.includes("anthropic") ||
    lower.includes("supabase") ||
    lower.includes("secret") ||
    lower.includes("publishable")
  ) {
    return new ParseFailure({
      code: "config_unavailable",
      message: "Resume parsing is temporarily unavailable right now. Continue manually or try again later.",
      retryable: false,
      stage: "preflight",
    });
  }

  if (
    lower.includes("timeout") ||
    lower.includes("overloaded") ||
    lower.includes("temporarily unavailable") ||
    lower.includes("connection") ||
    lower.includes("socket") ||
    lower.includes("network")
  ) {
    return new ParseFailure({
      code: "model_upstream",
      message: "The AI parser timed out before it finished. Try again in a moment.",
      retryable: true,
      stage: "ai_request",
    });
  }

  return new ParseFailure({
    code: "unknown",
    message: "We couldn't parse that resume right now. Continue manually or try again.",
    retryable: true,
    stage: "ai_request",
  });
}

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { resumeText?: string };
    const resumeText = body.resumeText?.trim();

    if (!resumeText) {
      return NextResponse.json(
        { error: "Resume text is required.", code: "request_invalid", retryable: false },
        { status: 400 },
      );
    }

    let supabase;
    try {
      supabase = createServiceRoleSupabaseClient();
      getAnthropicClient();
    } catch (dependencyError) {
      const failure = normalizeParseFailure(dependencyError);
      return NextResponse.json(
        { error: failure.message, code: failure.code, retryable: failure.retryable },
        { status: failure.status },
      );
    }

    const windowStart = getParseRateLimitWindowStart();
    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_name", "resume.parse")
      .gte("created_at", windowStart.toISOString());

    if (isParseRateLimited(count ?? 0)) {
      await trackEvent(user.id, "resume.parse.rate_limited", {
        characters: resumeText.length,
        attempts_in_window: count ?? 0,
      });
      return NextResponse.json(
        {
          error: "Resume parsing limit reached. Try again in about an hour.",
          code: "rate_limited",
          retryable: false,
          resetAt: new Date(windowStart.getTime() + 60 * 60 * 1000).toISOString(),
        },
        { status: 429 },
      );
    }

    await trackEvent(user.id, "resume.parse", {
      characters: resumeText.length,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const push = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(sse(payload)));
        };
        let stopReason: Message["stop_reason"] = null;
        let rawResponseText = "";

        try {
          push({ type: "progress", progress: 5, stage: "Sending to AI..." });
          await sleep(120);
          push({ type: "progress", ...STAGES[0] });

          const anthropic = getAnthropicClient();
          const response = await anthropic.messages.create({
            model: MODEL_NAME,
            max_tokens: MAX_PARSE_TOKENS,
            messages: [
              {
                role: "user",
                content: buildPrompt(resumeText),
              },
            ],
          });
          stopReason = response.stop_reason ?? null;

          STAGES.slice(1).forEach((stage) => {
            push({ type: "progress", progress: stage.progress, stage: stage.label });
          });

          rawResponseText = response.content
            .map((block) => ("text" in block ? block.text : ""))
            .join("");
          const parsed = parseAnthropicJson(rawResponseText, stopReason);

          push({ type: "progress", progress: 100, stage: "Done!" });
          push({ type: "result", data: parsed });
          controller.close();
        } catch (error) {
          const failure = normalizeParseFailure(error);
          await trackEvent(user.id, "resume.parse.failed", {
            characters: resumeText.length,
            error: error instanceof Error ? error.message : "Unable to parse resume",
            error_code: failure.code,
            failure_stage: failure.stage,
            retryable: failure.retryable,
            stop_reason: failure.metadata.stop_reason ?? stopReason,
            output_chars: rawResponseText.length,
          });
          console.error("resume.parse.failed", {
            userId: user.id,
            code: failure.code,
            stage: failure.stage,
            retryable: failure.retryable,
            stopReason: failure.metadata.stop_reason ?? stopReason,
            outputChars: rawResponseText.length,
            error: error instanceof Error ? error.message : String(error),
          });
          push({
            type: "error",
            message: failure.message,
            code: failure.code,
            retryable: failure.retryable,
            stage: failure.stage,
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request payload.", code: "request_invalid", retryable: false },
        { status: 400 },
      );
    }

    const failure = normalizeParseFailure(error);
    return NextResponse.json(
      { error: failure.message, code: failure.code, retryable: failure.retryable },
      { status: failure.status },
    );
  }
}
