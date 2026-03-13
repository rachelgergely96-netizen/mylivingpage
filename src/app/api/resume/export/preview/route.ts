import { NextResponse } from "next/server";
import { normalizeResumeDataForAts } from "@/lib/ats-review";
import { checkAtsResumeExport, renderAtsResumePdf } from "@/lib/pdf/ResumePDFDocument";
import { trackEvent } from "@/lib/track-event";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resumeData?: ResumeData };
    if (!body.resumeData) {
      return NextResponse.json({ error: "resumeData is required." }, { status: 400 });
    }

    const normalized = normalizeResumeDataForAts(body.resumeData);
    const exportCheck = await checkAtsResumeExport(normalized);
    const buffer = await renderAtsResumePdf(normalized);

    await trackEvent(null, "resume.export.preview", {
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
