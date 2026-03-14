export interface CreateFlowStreamPayload {
  type: string;
  [key: string]: unknown;
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
  return value instanceof Error ? value.message.trim() : String(value ?? "").trim();
}

export function normalizeCreateFlowError(stage: "parse" | "review", error: unknown) {
  const message = normalizeMessage(error);
  const lower = message.toLowerCase();

  if (!message) {
    return stage === "parse"
      ? "We couldn't parse that resume right now. Continue manually or try again in a moment."
      : "ATS review is temporarily unavailable. Retry the review or continue without it for now.";
  }

  if (
    lower === "failed to fetch" ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    return stage === "parse"
      ? "We couldn't reach resume parsing right now. Continue manually or try again in a moment."
      : "We couldn't reach ATS review right now. Retry the review or continue without it for now.";
  }

  if (lower.includes("temporarily unavailable")) {
    return message;
  }

  if (lower.includes("limit reached")) {
    return message;
  }

  if (lower.includes("resume parsing")) {
    return message;
  }

  if (lower.includes("ats review")) {
    return message;
  }

  return stage === "parse"
    ? "We couldn't parse that resume right now. Continue manually or try again in a moment."
    : "ATS review is temporarily unavailable. Retry the review or continue without it for now.";
}

