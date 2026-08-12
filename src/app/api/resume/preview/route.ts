import { NextResponse } from "next/server";
import {
  EDITOR_LAYOUT_PREVIEW_PAGE_ID,
  isEditorPreviewEnabled,
} from "@/lib/editor-preview";
import {
  countPdfPages,
  getFriendlyResumePdfError,
  renderResumePdf,
} from "@/lib/pdf/ResumePDFDocument";
import { coerceResumeDataForExport } from "@/lib/resume-export";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requireAuthenticatedUser } from "@/lib/security/route-security";
import { validateResumeDataPayload } from "@/lib/security/page-write";

export const runtime = "nodejs";
const routeTrustLevel = "authenticated_user";

const MAX_REQUEST_BODY_BYTES = 256 * 1024;

/**
 * Renders the résumé currently in the editor, inline.
 *
 * Distinct from `/api/resume/export`, which serves the *saved* page to the
 * public as a download. Owners were being told their PDF is ATS-safe and one
 * page while never being shown the artifact a recruiter receives; previewing
 * the saved version would show stale content mid-edit.
 */
export async function POST(request: Request) {
  const isLocalEditorPreview =
    isEditorPreviewEnabled() &&
    request.headers.get("x-editor-preview-page") ===
      EDITOR_LAYOUT_PREVIEW_PAGE_ID;

  let userId = EDITOR_LAYOUT_PREVIEW_PAGE_ID;
  if (!isLocalEditorPreview) {
    const authResult = await requireAuthenticatedUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    userId = authResult.value.user.id;
  }

  const declaredContentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredContentLength) &&
    declaredContentLength > MAX_REQUEST_BODY_BYTES
  ) {
    return NextResponse.json(
      { error: "Résumé preview requests must be 256 KB or smaller." },
      { status: 413 },
    );
  }

  if (!isLocalEditorPreview) {
    try {
      const rateLimit = await enforceRateLimit({
        request,
        policy: "ats_export_preview",
        route: "/api/resume/preview",
        userId,
      });
      if (rateLimit.limited) {
        return rateLimit.response;
      }
    } catch {
      return NextResponse.json(
        { error: "Résumé preview is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        { error: "Résumé preview requests must be 256 KB or smaller." },
        { status: 413 },
      );
    }
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const resumeData =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).resumeData
      : undefined;

  const validationError = validateResumeDataPayload(resumeData);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const normalized = coerceResumeDataForExport(resumeData);
    const buffer = await renderResumePdf(normalized);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        // Inline: this is for looking at, not for keeping. The public download
        // route remains the one that serves a file.
        "Content-Disposition": "inline; filename=\"resume-preview.pdf\"",
        "Cache-Control": "no-store",
        "X-Resume-Page-Count": String(countPdfPages(buffer)),
      },
    });
  } catch {
    // The render failure itself is not shown to the owner: react-pdf throws
    // minified React errors that read as noise. The export route takes the same
    // line.
    return NextResponse.json(
      {
        error: getFriendlyResumePdfError(
          null,
          "Unable to render the résumé preview right now. Please try again.",
        ),
      },
      { status: 422 },
    );
  }
}
