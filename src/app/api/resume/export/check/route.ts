import { NextResponse } from "next/server";
import { normalizeResumeDataForAts } from "@/lib/ats-review";
import { checkAtsResumeExport } from "@/lib/pdf/ResumePDFDocument";
import { trackEvent } from "@/lib/track-event";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resumeData?: ResumeData };
    if (!body.resumeData) {
      return NextResponse.json({ error: "resumeData is required." }, { status: 400 });
    }

    const exportCheck = await checkAtsResumeExport(normalizeResumeDataForAts(body.resumeData));
    await trackEvent(null, "resume.export.check", {
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
