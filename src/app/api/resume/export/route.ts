import { NextResponse } from "next/server";
import { isPubliclyAvailablePage } from "@/lib/hosting-state";
import {
  buildResumePdfFileName,
  coerceResumeDataForExport,
} from "@/lib/resume-export";
import { applyPageVariant, getPageVariant } from "@/lib/page-variants";
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
export const maxDuration = 30;
const routeTrustLevel = "public_read";

interface ResumeExportRequestBody {
  pageId?: string;
  variantId?: string | null;
}

interface PublicPageResumeSource {
  id: string;
  owner_id?: string | null;
  user_id?: string | null;
  status: "draft" | "live" | "archived" | null;
  visibility: "private" | "link" | "public" | null;
  resume_data: unknown;
  page_config?: Record<string, unknown> | null;
}

function getResumePdfErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown_render_error";
}

export async function POST(request: Request) {
  let requestedPageId: string | undefined;

  try {
    const body = (await request.json().catch(() => null)) as ResumeExportRequestBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    requestedPageId = body.pageId;
    if (!body.pageId) {
      return NextResponse.json({ error: "pageId is required." }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, owner_id, user_id, status, visibility, resume_data, page_config")
      .eq("id", body.pageId)
      .maybeSingle<PublicPageResumeSource>();

    if (pageError) {
      throw new Error(pageError.message);
    }

    if (!page || !isPubliclyAvailablePage(page)) {
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
      return NextResponse.json(
        {
          error:
            "Resume downloads are temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    const selectedVariant = getPageVariant(
      page.page_config ?? null,
      body.variantId ?? null,
    );
    const normalized = coerceResumeDataForExport(
      applyPageVariant(
        coerceResumeDataForExport(page.resume_data),
        selectedVariant,
      ),
    );
    let buffer: Uint8Array;
    let fallbackUsed = false;
    let primaryRenderError: string | null = null;

    try {
      buffer = await renderResumePdf(normalized);
    } catch (error) {
      primaryRenderError = getResumePdfErrorMessage(error);
      console.error("resume.export.primary_render_failed", {
        page_id: body.pageId,
        error: primaryRenderError,
      });

      try {
        buffer = await renderFallbackResumePdf(normalized);
        fallbackUsed = true;
      } catch (fallbackError) {
        const fallbackRenderError = getResumePdfErrorMessage(fallbackError);

        console.error("resume.export.fallback_render_failed", {
          page_id: body.pageId,
          primary_error: primaryRenderError,
          fallback_error: fallbackRenderError,
        });

        await trackEvent(null, "resume.export.download_failed", {
          page_id: body.pageId,
          variant_id: body.variantId ?? null,
          renderable: false,
          fallback_used: false,
          error_stage: "fallback",
          error: fallbackRenderError,
          primary_error: primaryRenderError,
          fallback_error: fallbackRenderError,
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
      variant_id: body.variantId ?? null,
      page_count: pageCount,
      fits_on_one_page: pageCount === 1,
      renderable: true,
      fallback_used: fallbackUsed,
      primary_error: primaryRenderError,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildResumePdfFileName(normalized.name)}"`,
      },
    });
  } catch (error) {
    console.error("resume.export.unhandled_error", {
      page_id: requestedPageId ?? null,
      error: getResumePdfErrorMessage(error),
    });

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
