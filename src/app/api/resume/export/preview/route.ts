import { NextResponse } from "next/server";
import {
  getAtsRenderFailureReason,
  isAtsExportRenderable,
  normalizeResumeDataForAts,
} from "@/lib/ats-review";
import {
  checkAtsResumeExport,
  getFriendlyAtsPdfError,
  renderAtsResumePdf,
} from "@/lib/pdf/ResumePDFDocument";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requireAuthenticatedUser } from "@/lib/security/route-security";
import { trackEvent } from "@/lib/track-event";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";
const routeTrustLevel = "authenticated_user";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthenticatedUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { user } = authResult.value;

    const rateLimit = await enforceRateLimit({
      request,
      policy: "ats_export_preview",
      route: "/api/resume/export/preview",
      userId: user.id,
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }

    const body = (await request.json()) as { resumeData?: ResumeData };
    if (!body.resumeData) {
      return NextResponse.json({ error: "resumeData is required." }, { status: 400 });
    }

    const normalized = normalizeResumeDataForAts(body.resumeData);
    const exportCheck = await checkAtsResumeExport(normalized);
    if (!isAtsExportRenderable(exportCheck)) {
      await trackEvent(user.id, "resume.export.preview_failed", {
        page_count: exportCheck.pageCount,
        fits_on_one_page: exportCheck.fitsOnOnePage,
        renderable: exportCheck.renderable,
        render_failure_reason: exportCheck.renderFailureReason,
        overflow_reasons: exportCheck.overflowReasons,
        error: exportCheck.renderFailureReason ?? "ats_pdf_render_check_failed",
      });

      return NextResponse.json(
        {
          error: getFriendlyAtsPdfError(
            exportCheck,
            "Unable to render the ATS PDF preview right now. Save your latest edits or rerun ATS review and try again.",
          ),
          ...exportCheck,
        },
        { status: 422 },
      );
    }

    let buffer: Uint8Array;

    try {
      buffer = await renderAtsResumePdf(normalized);
    } catch (error) {
      const renderFailureReason = getAtsRenderFailureReason(
        { renderable: false, renderFailureReason: null },
        "Unable to render the ATS PDF preview right now. Save your latest edits or rerun ATS review and try again.",
      );

      await trackEvent(user.id, "resume.export.preview_failed", {
        page_count: exportCheck.pageCount,
        fits_on_one_page: exportCheck.fitsOnOnePage,
        renderable: false,
        render_failure_reason: renderFailureReason,
        overflow_reasons: exportCheck.overflowReasons,
        error: error instanceof Error ? error.message : "unknown_render_error",
      });

      return NextResponse.json(
        {
          error: renderFailureReason,
          renderable: false,
          renderFailureReason,
          pageCount: null,
          fitsOnOnePage: null,
          overflowReasons: [],
          recommendedFixes: [],
        },
        { status: 422 },
      );
    }

    await trackEvent(user.id, "resume.export.preview", {
      page_count: exportCheck.pageCount,
      fits_on_one_page: exportCheck.fitsOnOnePage,
      renderable: exportCheck.renderable,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "x-ats-page-count": String(exportCheck.pageCount),
        "x-ats-fits-one-page": String(exportCheck.fitsOnOnePage),
        "x-ats-renderable": String(exportCheck.renderable),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: getFriendlyAtsPdfError(
          null,
          "Unable to preview the ATS PDF right now. Save your latest edits or rerun ATS review and try again.",
        ),
      },
      { status: 400 },
    );
  }
}
