import { NextResponse } from "next/server";
import { normalizeResumeDataForAts } from "@/lib/ats-review";
import { checkAtsResumeExport, renderAtsResumePdf } from "@/lib/pdf/ResumePDFDocument";
import { trackEvent } from "@/lib/track-event";
import type { ResumeData } from "@/types/resume";

export const runtime = "nodejs";

function buildFileName(name: string) {
  return `${(name || "resume").trim().replace(/\s+/g, "-").toLowerCase()}-ats-resume.pdf`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resumeData?: ResumeData };
    if (!body.resumeData) {
      return NextResponse.json({ error: "resumeData is required." }, { status: 400 });
    }

    const normalized = normalizeResumeDataForAts(body.resumeData);
    const exportCheck = await checkAtsResumeExport(normalized);

    if (!exportCheck.fitsOnOnePage) {
      await trackEvent(null, "resume.export.blocked", {
        page_count: exportCheck.pageCount,
        overflow_reasons: exportCheck.overflowReasons,
      });
      return NextResponse.json(exportCheck, { status: 409 });
    }

    const buffer = await renderAtsResumePdf(normalized);

    await trackEvent(null, "resume.export.downloaded", {
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
