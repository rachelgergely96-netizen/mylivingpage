import { NextResponse } from "next/server";
import { evaluateAtsReadiness } from "@/lib/ats-readiness";
import { checkResumeExport } from "@/lib/pdf/ResumePDFDocument";
import { coerceResumeDataForExport } from "@/lib/resume-export";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requireAuthenticatedUser } from "@/lib/security/route-security";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";
const routeTrustLevel = "authenticated_user";

const MAX_TARGET_TITLE_LENGTH = 160;
const MAX_JOB_DESCRIPTION_LENGTH = 20_000;
const MAX_REQUEST_BODY_BYTES = 200_000;

interface ReadinessRequestBody {
  resumeData: Record<string, unknown>;
  targetTitle?: string;
  jobDescription?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequestBody(value: unknown):
  | { value: ReadinessRequestBody }
  | { error: string } {
  if (!isRecord(value) || !isRecord(value.resumeData)) {
    return { error: "resumeData must be an object." };
  }

  if (value.targetTitle !== undefined && typeof value.targetTitle !== "string") {
    return { error: "targetTitle must be a string." };
  }

  if (value.jobDescription !== undefined && typeof value.jobDescription !== "string") {
    return { error: "jobDescription must be a string." };
  }

  if (
    typeof value.targetTitle === "string" &&
    value.targetTitle.length > MAX_TARGET_TITLE_LENGTH
  ) {
    return {
      error: `targetTitle must be ${MAX_TARGET_TITLE_LENGTH} characters or fewer.`,
    };
  }

  if (
    typeof value.jobDescription === "string" &&
    value.jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH
  ) {
    return {
      error: `jobDescription must be ${MAX_JOB_DESCRIPTION_LENGTH.toLocaleString("en-US")} characters or fewer.`,
    };
  }

  const targetTitle = value.targetTitle?.trim();
  const jobDescription = value.jobDescription?.trim();

  return {
    value: {
      resumeData: value.resumeData,
      ...(targetTitle ? { targetTitle } : {}),
      ...(jobDescription ? { jobDescription } : {}),
    },
  };
}

function normalizeResumeData(resumeData: Record<string, unknown>): ResumeData {
  const normalizedData = coerceResumeDataForExport(resumeData);
  const sourceName = resumeData.name;

  // The export coercer uses "Resume" as a safe PDF fallback. Keep a genuinely
  // missing name visible to the readiness rules while retaining its safe shape.
  if (typeof sourceName !== "string" || !sourceName.trim()) {
    return { ...normalizedData, name: "" };
  }

  return normalizedData;
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if ("response" in authResult) {
    return authResult.response;
  }

  const declaredContentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredContentLength) &&
    declaredContentLength > MAX_REQUEST_BODY_BYTES
  ) {
    return NextResponse.json(
      { error: "Resume check requests must be 200 KB or smaller." },
      { status: 413 },
    );
  }

  const { user } = authResult.value;
  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "ats_export_check",
      route: "/api/resume/readiness",
      userId: user.id,
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }
  } catch {
    return NextResponse.json(
      { error: "ATS readiness is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }

  let untrustedBody: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        { error: "Resume check requests must be 200 KB or smaller." },
        { status: 413 },
      );
    }
    untrustedBody = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const bodyResult = validateRequestBody(untrustedBody);
  if ("error" in bodyResult) {
    return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  }

  try {
    const { resumeData, targetTitle, jobDescription } = bodyResult.value;
    const normalizedData = normalizeResumeData(resumeData);
    const exportCheck = await checkResumeExport(normalizedData);
    const readiness = evaluateAtsReadiness({
      data: normalizedData,
      exportCheck,
      ...(targetTitle ? { targetTitle } : {}),
      ...(jobDescription ? { jobDescription } : {}),
    });

    return NextResponse.json({ readiness });
  } catch {
    return NextResponse.json(
      { error: "Unable to check ATS readiness." },
      { status: 500 },
    );
  }
}
