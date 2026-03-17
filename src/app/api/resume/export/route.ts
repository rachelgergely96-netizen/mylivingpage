import { NextResponse } from "next/server";
import {
  getAtsAvailabilityReason,
  hasApprovedAtsResume,
  normalizeResumeDataForAts,
} from "@/lib/ats-review";
import { checkAtsResumeExport, renderAtsResumePdf } from "@/lib/pdf/ResumePDFDocument";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { trackEvent } from "@/lib/track-event";
import type { PageConfig, ResumeData } from "@/types/resume";

export const runtime = "nodejs";
export const routeTrustLevel = "public_read";

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
    const approvedResumeData = hasApprovedAtsResume(atsReview)
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

    if (!exportCheck.fitsOnOnePage) {
      await trackEvent(null, "resume.export.blocked", {
        page_id: body.pageId,
        page_count: exportCheck.pageCount,
        overflow_reasons: exportCheck.overflowReasons,
      });
      return NextResponse.json(exportCheck, { status: 409 });
    }

    const buffer = await renderAtsResumePdf(normalized);

    await trackEvent(null, "resume.export.downloaded", {
      page_id: body.pageId,
      page_count: exportCheck.pageCount,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildFileName(normalized.name)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to export ATS PDF." },
      { status: 400 },
    );
  }
}
