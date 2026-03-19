import { NextResponse } from "next/server";
import {
  canDownloadApprovedAtsResume,
  getAtsRenderFailureReason,
  getAtsAvailabilityReason,
  isAtsExportRenderable,
  normalizeResumeDataForAts,
} from "@/lib/ats-review";
import {
  checkAtsResumeExport,
  getFriendlyAtsPdfError,
  renderAtsResumePdf,
} from "@/lib/pdf/ResumePDFDocument";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import type { PageConfig, ResumeData } from "@/types/resume";

export const runtime = "nodejs";
const routeTrustLevel = "public_read";

function buildFileName(name: string) {
  return `${(name || "resume").trim().replace(/\s+/g, "-").toLowerCase()}-ats-resume.pdf`;
}

interface ResumeExportRequestBody {
  pageId?: string;
}

interface PublicPageAtsSource {
  id: string;
  status: "draft" | "live" | "archived" | null;
  visibility: "private" | "link" | "public" | null;
  page_config: PageConfig | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResumeExportRequestBody;
    if (!body.pageId) {
      return NextResponse.json({ error: "pageId is required." }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, status, visibility, page_config")
      .eq("id", body.pageId)
      .maybeSingle<PublicPageAtsSource>();

    if (pageError) {
      throw new Error(pageError.message);
    }

    if (!page || (page.status !== "live" && page.visibility !== "public")) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const atsReview = page.page_config?.ats ?? null;
    const approvedResumeData = canDownloadApprovedAtsResume(atsReview)
      ? (atsReview?.approvedResumeData ?? null)
      : null;

    if (!approvedResumeData) {
      return NextResponse.json(
        { error: getAtsAvailabilityReason(atsReview) },
        { status: 409 },
      );
    }

    const rateLimit = await enforceRateLimit({
      request,
      policy: "ats_export_download",
      route: "/api/resume/export",
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }

    const normalized = normalizeResumeDataForAts(approvedResumeData as ResumeData);
    const exportCheck = await checkAtsResumeExport(normalized);
    if (!isAtsExportRenderable(exportCheck)) {
      await trackEvent(null, "resume.export.download_failed", {
        page_id: body.pageId,
        page_count: exportCheck.pageCount,
        fits_on_one_page: exportCheck.fitsOnOnePage,
        renderable: exportCheck.renderable,
        render_failure_reason: exportCheck.renderFailureReason,
        error: exportCheck.renderFailureReason ?? "ats_pdf_render_check_failed",
      });

      return NextResponse.json(
        {
          error: getFriendlyAtsPdfError(
            exportCheck,
            "Unable to export the ATS PDF right now. Save your latest edits or rerun ATS review and try again.",
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
        "Unable to export the ATS PDF right now. Save your latest edits or rerun ATS review and try again.",
      );

      await trackEvent(null, "resume.export.download_failed", {
        page_id: body.pageId,
        page_count: exportCheck.pageCount,
        fits_on_one_page: exportCheck.fitsOnOnePage,
        renderable: false,
        render_failure_reason: renderFailureReason,
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

    await trackEvent(null, "resume.export.downloaded", {
      page_id: body.pageId,
      page_count: exportCheck.pageCount,
      fits_on_one_page: exportCheck.fitsOnOnePage,
      renderable: exportCheck.renderable,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildFileName(normalized.name)}"`,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: getFriendlyAtsPdfError(
          null,
          "Unable to export the ATS PDF right now. Save your latest edits or rerun ATS review and try again.",
        ),
      },
      { status: 400 },
    );
  }
}
