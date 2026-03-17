export interface CreateFlowStreamPayload {
  type: string;
  [key: string]: unknown;
}

export type CreateFlowFailureCode =
  | "request_invalid"
  | "config_unavailable"
  | "rate_limited"
  | "model_upstream"
  | "model_truncated"
  | "invalid_json"
  | "schema_invalid"
  | "network"
  | "unknown";

export interface NormalizedCreateFlowError {
  message: string;
  code: CreateFlowFailureCode | null;
  retryable: boolean;
}

export function parseSseChunk(
  chunk: string,
  onMessage: (payload: CreateFlowStreamPayload) => void,
) {
  const events = chunk.split("\n\n");
  const remainder = events.pop() ?? "";

  for (const event of events) {
    const dataLine = event
      .split("\n")
      .find((line) => line.startsWith("data:"))
      ?.slice(5)
      .trim();

    if (!dataLine) {
      continue;
    }

    let payload: CreateFlowStreamPayload;
    try {
      payload = JSON.parse(dataLine) as CreateFlowStreamPayload;
    } catch {
      continue;
    }

    onMessage(payload);
  }

  return remainder;
}

function normalizeMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message.trim();
  }

  if (typeof value === "object" && value !== null && "message" in value) {
    return String((value as { message?: unknown }).message ?? "").trim();
  }

  return String(value ?? "").trim();
}

function normalizeStructuredFailure(error: unknown): NormalizedCreateFlowError | null {
  if (!error || typeof error !== "object" || error instanceof Error) {
    return null;
  }

  const candidate = error as {
    message?: unknown;
    code?: unknown;
    retryable?: unknown;
  };
  const message = typeof candidate.message === "string" ? candidate.message.trim() : "";
  const code = typeof candidate.code === "string" ? (candidate.code as CreateFlowFailureCode) : null;
  const retryable = typeof candidate.retryable === "boolean" ? candidate.retryable : null;

  const hasStructuredMetadata =
    typeof candidate.code === "string" || typeof candidate.retryable === "boolean";

  if (!message || !hasStructuredMetadata) {
    return null;
  }

  return {
    message,
    code,
    retryable:
      retryable ??
      (!code || (code !== "config_unavailable" && code !== "request_invalid" && code !== "rate_limited")),
  };
}

export function normalizeCreateFlowError(stage: "parse" | "review", error: unknown): NormalizedCreateFlowError {
  const structured = normalizeStructuredFailure(error);
  if (structured) {
    return structured;
  }

  const message = normalizeMessage(error);
  const lower = message.toLowerCase();

  if (!message) {
    return {
      message:
        stage === "parse"
          ? "We couldn't parse that resume right now. Continue manually or try again in a moment."
          : "ATS review is temporarily unavailable. Retry the review or continue without it for now.",
      code: null,
      retryable: true,
    };
  }

  if (
    lower === "failed to fetch" ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    return {
      message:
        stage === "parse"
          ? "We couldn't reach resume parsing right now. Continue manually or try again in a moment."
          : "We couldn't reach ATS review right now. Retry the review or continue without it for now.",
      code: "network",
      retryable: true,
    };
  }

  if (lower.includes("temporarily unavailable")) {
    return { message, code: null, retryable: true };
  }

  if (lower.includes("limit reached")) {
    return { message, code: "rate_limited", retryable: false };
  }

  if (lower.includes("resume parsing")) {
    return { message, code: null, retryable: true };
  }

  if (lower.includes("ats review")) {
    return { message, code: null, retryable: true };
  }

  return {
    message:
      stage === "parse"
        ? "We couldn't parse that resume right now. Continue manually or try again in a moment."
        : "ATS review is temporarily unavailable. Retry the review or continue without it for now.",
    code: "unknown",
    retryable: true,
  };
}
