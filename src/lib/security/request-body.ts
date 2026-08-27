export type LimitedUtf8BodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" | "unreadable" };

/**
 * Reads a UTF-8 request body without ever retaining more than `maxBytes`.
 *
 * `content-length` is an early rejection hint only; the streamed byte count is
 * authoritative so chunked requests and inaccurate headers remain bounded.
 */
export async function readUtf8BodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<LimitedUtf8BodyResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) {
    return { ok: true, text: "" };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const textChunks: string[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        textChunks.push(decoder.decode());
        return { ok: true, text: textChunks.join("") };
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }

      textChunks.push(decoder.decode(value, { stream: true }));
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, reason: "unreadable" };
  } finally {
    reader.releaseLock();
  }
}
