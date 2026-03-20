import { NextResponse } from "next/server";
import {
  buildResumePdfFileName,
  coerceResumeDataForExport,
} from "@/lib/resume-export";
import {
  countPdfPages,
  getFriendlyResumePdfError,
  renderFallbackResumePdf,
  renderResumePdf,
} from "@/lib/pdf/ResumePDFDocument";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";

export const runtime = "nodejs";
const routeTrustLevel = "public_read";

interface ResumeExportRequestBody {
  pageId?: string;
}

interface PublicPageResumeSource {
  id: string;
  status: "draft" | "live" | "archived" | null;
  visibility: "private" | "link" | "public" | null;
  resume_data: unknown;
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

    try {
      const rateLimit = await enforceRateLimit({
        request,
        policy: "ats_export_download",
        route: "/api/resume/export",
      });
      if (rateLimit.limited) {
        return rateLimit.response;
      }
    } catch (rateLimitError) {
      console.error("resume.export.rate_limit_unavailable", {
        page_id: body.pageId,
        error:
          rateLimitError instanceof Error
            ? rateLimitError.message
            : "unknown_rate_limit_error",
      });
    }

    const normalized = coerceResumeDataForExport(page.resume_data);
    let buffer: Uint8Array;
    let fallbackUsed = false;

    try {
      buffer = await renderResumePdf(normalized);
    } catch (error) {
      try {
        buffer = await renderFallbackResumePdf(normalized);
        fallbackUsed = true;
      } catch (fallbackError) {
        await trackEvent(null, "resume.export.download_failed", {
          page_id: body.pageId,
          renderable: false,
          fallback_used: false,
          error:
            fallbackError instanceof Error
              ? fallbackError.message
              : error instanceof Error
                ? error.message
                : "unknown_render_error",
        });

        return NextResponse.json(
          {
            error: getFriendlyResumePdfError(
              null,
              "Unable to export the Resume PDF right now. Please try again.",
            ),
          },
          { status: 422 },
        );
      }
    }

    const pageCount = countPdfPages(buffer);

    await trackEvent(null, "resume.export.downloaded", {
      page_id: body.pageId,
      page_count: pageCount,
      fits_on_one_page: pageCount === 1,
      renderable: true,
      fallback_used: fallbackUsed,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildResumePdfFileName(normalized.name)}"`,
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
