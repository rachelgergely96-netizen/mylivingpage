import { NextResponse } from "next/server";
import { normalizeResumeDataForAts } from "@/lib/ats-review";
import { checkAtsResumeExport } from "@/lib/pdf/ResumePDFDocument";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requireAuthenticatedUser } from "@/lib/security/route-security";
import { trackEvent } from "@/lib/track-event";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";
export const routeTrustLevel = "authenticated_user";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuthenticatedUser();
    if ("response" in authResult) {
      return authResult.response;
    }
    const { user } = authResult.value;

    const rateLimit = await enforceRateLimit({
      request,
      policy: "ats_export_check",
      route: "/api/resume/export/check",
      userId: user.id,
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }

    const body = (await request.json()) as { resumeData?: ResumeData };
    if (!body.resumeData) {
      return NextResponse.json({ error: "resumeData is required." }, { status: 400 });
    }

    const exportCheck = await checkAtsResumeExport(normalizeResumeDataForAts(body.resumeData));
    await trackEvent(user.id, "resume.export.check", {
      page_count: exportCheck.pageCount,
      fits_on_one_page: exportCheck.fitsOnOnePage,
    });

    return NextResponse.json(exportCheck);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to validate the ATS PDF." },
      { status: 400 },
    );
  }
}
