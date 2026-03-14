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
    expect(normalizeCreateFlowError("parse", new TypeError("Failed to fetch"))).toContain(
      "Continue manually",
    );
  });

  it("normalizes raw network failures into user-facing ATS review copy", () => {
    expect(normalizeCreateFlowError("review", new TypeError("Failed to fetch"))).toContain(
      "continue without it",
    );
  });
});

