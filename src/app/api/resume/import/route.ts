import { NextResponse } from "next/server";
import {
  extractResumeFileText,
  MAX_RESUME_FILE_BYTES,
  MAX_RESUME_FILE_LABEL,
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

type LimitedBodyResult =
  | { ok: true; body: ArrayBuffer }
  | { ok: false; tooLarge: boolean };

async function readBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<LimitedBodyResult> {
  if (!request.body) {
    return { ok: true, body: new ArrayBuffer(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, tooLarge: false };
  }

  const body = new ArrayBuffer(totalBytes);
  const bytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, body };
}

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
      { error: "Résumé import is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }

  const declaredContentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredContentLength) &&
    declaredContentLength > MAX_MULTIPART_BODY_BYTES
  ) {
    return NextResponse.json(
      { error: `Résumé files must be ${MAX_RESUME_FILE_LABEL} or smaller.` },
      { status: 413 },
    );
  }

  const body = await readBodyWithLimit(request, MAX_MULTIPART_BODY_BYTES);
  if (!body.ok) {
    if (body.tooLarge) {
      return NextResponse.json(
        { error: `Résumé files must be ${MAX_RESUME_FILE_LABEL} or smaller.` },
        { status: 413 },
      );
    }
    return NextResponse.json(
      { error: "We could not read that import. Try selecting the file again." },
      { status: 400 },
    );
  }

  const multipartHeaders = new Headers(request.headers);
  multipartHeaders.delete("content-length");
  const formData = await new Request(request.url, {
    method: request.method,
    headers: multipartHeaders,
    body: body.body,
  })
    .formData()
    .catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "We could not read that import. Try selecting the file again." },
      { status: 400 },
    );
  }

  const fileValue = formData.get("file");
  const textValue = formData.get("text");
  let resumeText = "";
  let sourceName = "Pasted résumé";
  let sourceKind: "pdf" | "docx" | "text" | "pasted" = "pasted";

  try {
    if (typeof fileValue !== "string" && fileValue) {
      if (fileValue.size > MAX_RESUME_FILE_BYTES) {
        return NextResponse.json(
          { error: `Résumé files must be ${MAX_RESUME_FILE_LABEL} or smaller.` },
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
      const pastedResumeText = textValue.trim();
      if (pastedResumeText.length > MAX_RESUME_TEXT_CHARACTERS) {
        return NextResponse.json(
          {
            error: `Pasted résumé text must be ${MAX_RESUME_TEXT_CHARACTERS.toLocaleString("en-US")} characters or fewer.`,
          },
          { status: 413 },
        );
      }
      resumeText = pastedResumeText;
    }
  } catch (error) {
    if (error instanceof ResumeFileError) {
      const status = error.code === "file_too_large" ? 413 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "We could not read that résumé. Try pasting its text instead." },
      { status: 400 },
    );
  }

  const meaningfulCharacters = resumeText.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (meaningfulCharacters < 20) {
    return NextResponse.json(
      { error: "Add more résumé text before autofilling your page." },
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
