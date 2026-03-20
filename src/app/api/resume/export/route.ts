import { NextResponse } from "next/server";
import { syncPageHostingState } from "@/lib/hosting-state";
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
  owner_id?: string | null;
  user_id?: string | null;
  status: "draft" | "live" | "archived" | null;
  visibility: "private" | "link" | "public" | null;
  resume_data: unknown;
}

function getResumePdfErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown_render_error";
}

export async function POST(request: Request) {
  let requestedPageId: string | undefined;

  try {
    const body = (await request.json()) as ResumeExportRequestBody;
    requestedPageId = body.pageId;
    if (!body.pageId) {
      return NextResponse.json({ error: "pageId is required." }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, owner_id, user_id, status, visibility, resume_data")
      .eq("id", body.pageId)
      .maybeSingle<PublicPageResumeSource>();

    if (pageError) {
      throw new Error(pageError.message);
    }

    const pageOwnerId = page?.owner_id ?? page?.user_id ?? null;
    const { data: ownerProfile } = pageOwnerId
      ? await supabase
          .from("profiles")
          .select("plan, billing_cohort, hosting_trial_started_at")
          .eq("id", pageOwnerId)
          .maybeSingle()
      : { data: null };

    const syncedPage = page
      ? await syncPageHostingState(supabase, page, {
          plan: ownerProfile?.plan ?? null,
          billing_cohort: ownerProfile?.billing_cohort ?? null,
          hosting_trial_started_at: ownerProfile?.hosting_trial_started_at ?? null,
        })
      : null;

    const publicDownloadAllowed =
      syncedPage?.page.visibility === "public" ||
      (syncedPage?.page.visibility == null && syncedPage?.page.status === "live");

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

    const normalized = coerceResumeDataForExport(syncedPage.page.resume_data);
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
