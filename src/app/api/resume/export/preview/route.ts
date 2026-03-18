import { NextResponse } from "next/server";
import { normalizeResumeDataForAts } from "@/lib/ats-review";
import { checkAtsResumeExport, renderAtsResumePdf } from "@/lib/pdf/ResumePDFDocument";
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
    let buffer: Uint8Array;

    try {
      buffer = await renderAtsResumePdf(normalized);
    } catch (error) {
      await trackEvent(user.id, "resume.export.preview_failed", {
        page_count: exportCheck.pageCount,
        fits_on_one_page: exportCheck.fitsOnOnePage,
        overflow_reasons: exportCheck.overflowReasons,
        error: error instanceof Error ? error.message : "unknown_render_error",
      });

      return NextResponse.json(
        {
          error:
            exportCheck.recommendedFixes[0] ??
            exportCheck.overflowReasons[0] ??
            "Unable to render the ATS PDF preview right now.",
          pageCount: exportCheck.pageCount,
          fitsOnOnePage: exportCheck.fitsOnOnePage,
          overflowReasons: exportCheck.overflowReasons,
          recommendedFixes: exportCheck.recommendedFixes,
        },
        { status: 422 },
      );
    }

    await trackEvent(user.id, "resume.export.preview", {
      page_count: exportCheck.pageCount,
      fits_on_one_page: exportCheck.fitsOnOnePage,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "x-ats-page-count": String(exportCheck.pageCount),
        "x-ats-fits-one-page": String(exportCheck.fitsOnOnePage),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to preview the ATS PDF." },
      { status: 400 },
    );
  }
}
