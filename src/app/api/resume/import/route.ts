import { NextResponse } from "next/server";
import {
  extractResumeFileText,
  MAX_RESUME_FILE_BYTES,
  ResumeFileError,
} from "@/lib/resume-file";
import {
  MAX_RESUME_TEXT_CHARACTERS,
  parseResumeText,
} from "@/lib/resume-import";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requireAuthenticatedUser } from "@/lib/security/route-security";

export const runtime = "nodejs";
const routeTrustLevel = "authenticated_user";
const MAX_MULTIPART_BODY_BYTES = MAX_RESUME_FILE_BYTES + 256 * 1024;

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser();
  if ("response" in authResult) {
    return authResult.response;
  }

  const { user } = authResult.value;
  try {
    const rateLimit = await enforceRateLimit({
      request,
      policy: "resume_import",
      route: "/api/resume/import",
      userId: user.id,
    });
    if (rateLimit.limited) {
      return rateLimit.response;
    }
  } catch {
    return NextResponse.json(
      { error: "Resume import is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }

  const declaredContentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredContentLength) &&
    declaredContentLength > MAX_MULTIPART_BODY_BYTES
  ) {
    return NextResponse.json(
      { error: "Resume files must be 6 MB or smaller." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "We could not read that import. Try selecting the file again." },
      { status: 400 },
    );
  }

  const fileValue = formData.get("file");
  const textValue = formData.get("text");
  let resumeText = "";
  let sourceName = "Pasted resume";
  let sourceKind: "pdf" | "docx" | "text" | "pasted" = "pasted";

  try {
    if (typeof fileValue !== "string" && fileValue) {
      if (fileValue.size > MAX_RESUME_FILE_BYTES) {
        return NextResponse.json(
          { error: "Resume files must be 6 MB or smaller." },
          { status: 413 },
        );
      }
      const extracted = extractResumeFileText({
        buffer: Buffer.from(await fileValue.arrayBuffer()),
        fileName: fileValue.name,
        contentType: fileValue.type,
      });
      resumeText = extracted.text;
      sourceName = fileValue.name;
      sourceKind = extracted.kind;
    } else if (typeof textValue === "string") {
      resumeText = textValue.trim().slice(0, MAX_RESUME_TEXT_CHARACTERS);
    }
  } catch (error) {
    if (error instanceof ResumeFileError) {
      const status = error.code === "file_too_large" ? 413 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "We could not read that resume. Try pasting its text instead." },
      { status: 400 },
    );
  }

  const meaningfulCharacters = resumeText.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (meaningfulCharacters < 20) {
    return NextResponse.json(
      { error: "Add more resume text before autofilling your page." },
      { status: 400 },
    );
  }

  const parsed = parseResumeText(resumeText);
  return NextResponse.json({
    ...parsed,
    text: resumeText,
    sourceName,
    sourceKind,
  });
}
