import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";

const MODEL_NAME = "claude-sonnet-4-20250514";

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
      "highlights": ["string", "string"]
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

function parseAnthropicJson(rawText: string): ResumeData {
  const clean = rawText.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean) as ResumeData;
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Could not parse AI response as JSON");
    }
    return JSON.parse(match[0]) as ResumeData;
  }
}

function sse(payload: Record<string, unknown>) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resumeText?: string };
    const resumeText = body.resumeText?.trim();

    if (!resumeText) {
      return NextResponse.json({ error: "Resume text is required." }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const push = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(sse(payload)));
        };

        try {
          push({ type: "progress", progress: 5, stage: "Sending to AI..." });
          await sleep(120);
          push({ type: "progress", ...STAGES[0] });

          const anthropic = getAnthropicClient();
          const response = await anthropic.messages.create({
            model: MODEL_NAME,
            max_tokens: 2000,
            messages: [
              {
                role: "user",
                content: buildPrompt(resumeText),
              },
            ],
          });

          STAGES.slice(1).forEach((stage) => {
            push({ type: "progress", progress: stage.progress, stage: stage.label });
          });

          const text = response.content
            .map((block) => ("text" in block ? block.text : ""))
            .join("");
          const parsed = parseAnthropicJson(text);

          push({ type: "progress", progress: 100, stage: "Done!" });
          push({ type: "result", data: parsed });
          controller.close();
        } catch (error) {
          push({
            type: "error",
            message: error instanceof Error ? error.message : "Unable to parse resume",
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload." },
      { status: 400 },
    );
  }
}
