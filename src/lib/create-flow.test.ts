import { describe, expect, it } from "vitest";
import { normalizeCreateFlowError, parseSseChunk } from "@/lib/create-flow";

describe("create flow helpers", () => {
  it("surfaces SSE callback errors instead of swallowing them", () => {
    expect(() =>
      parseSseChunk('data: {"type":"error","message":"Boom"}\n\n', (payload) => {
        if (payload.type === "error") {
          throw new Error(String(payload.message));
        }
      }),
    ).toThrow("Boom");
  });

  it("normalizes raw network failures into user-facing parse copy", () => {
    expect(normalizeCreateFlowError(new TypeError("Failed to fetch")).message).toContain("Continue manually");
  });

  it("preserves structured parse failures from the server", () => {
    expect(
      normalizeCreateFlowError({
        message: "The AI parser returned malformed output. Try again in a moment.",
        code: "invalid_json",
        retryable: true,
      }),
    ).toEqual({
      message: "The AI parser returned malformed output. Try again in a moment.",
      code: "invalid_json",
      retryable: true,
    });
  });
});
