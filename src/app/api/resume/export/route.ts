import { NextResponse } from "next/server";
import { normalizeResumeDataForExport } from "@/lib/resume-export";
import {
  checkResumeExport,
  getFriendlyResumePdfError,
  renderResumePdf,
} from "@/lib/pdf/ResumePDFDocument";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";
const routeTrustLevel = "public_read";

function buildFileName(name: string) {
  return `${(name || "resume").trim().replace(/\s+/g, "-").toLowerCase()}-resume.pdf`;
}

interface ResumeExportRequestBody {
  pageId?: string;
}

interface PublicPageResumeSource {
  id: string;
  status: "draft" | "live" | "archived" | null;
  visibility: "private" | "link" | "public" | null;
  resume_data: ResumeData;
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
      .select("id, status, visibility, resume_data")
      .eq("id", body.pageId)
      .maybeSingle<PublicPageResumeSource>();

    if (pageError) {
      throw new Error(pageError.message);
    }

    const publicDownloadAllowed =
      page?.visibility === "public" || (page?.visibility == null && page?.status === "live");

    if (!page || !publicDownloadAllowed) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const rateLimit = await enforceRateLimit({
      request,
      policy: "ats_export_download",
      route: "/api/resume/export",
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }

    const normalized = normalizeResumeDataForExport(page.resume_data as ResumeData);
    const exportCheck = await checkResumeExport(normalized);

    if (!exportCheck.renderable) {
      await trackEvent(null, "resume.export.download_failed", {
        page_id: body.pageId,
        page_count: exportCheck.pageCount,
        fits_on_one_page: exportCheck.fitsOnOnePage,
        renderable: exportCheck.renderable,
        render_failure_reason: exportCheck.renderFailureReason,
        error: exportCheck.renderFailureReason ?? "resume_pdf_render_check_failed",
      });

      return NextResponse.json(
        {
          error: getFriendlyResumePdfError(
            exportCheck,
            "Unable to export the Resume PDF right now. Please try again.",
          ),
          ...exportCheck,
        },
        { status: 422 },
      );
    }

    let buffer: Uint8Array;

    try {
      buffer = await renderResumePdf(normalized);
    } catch (error) {
      await trackEvent(null, "resume.export.download_failed", {
        page_id: body.pageId,
        page_count: exportCheck.pageCount,
        fits_on_one_page: exportCheck.fitsOnOnePage,
        renderable: false,
        render_failure_reason: exportCheck.renderFailureReason,
        error: error instanceof Error ? error.message : "unknown_render_error",
      });

      return NextResponse.json(
        {
          error: getFriendlyResumePdfError(
            exportCheck,
            "Unable to export the Resume PDF right now. Please try again.",
          ),
          ...exportCheck,
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
        error: getFriendlyResumePdfError(
          null,
          "Unable to export the Resume PDF right now. Please try again.",
        ),
      },
      { status: 400 },
    );
  }
}
