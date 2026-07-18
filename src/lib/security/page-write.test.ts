import { describe, expect, it } from "vitest";
import {
  MAX_PAGE_CONFIG_BYTES,
  validatePageConfigPayload,
  validateResumeDataPayload,
} from "@/lib/security/page-write";

describe("page write payload validation", () => {
  it("accepts the supported resume and page configuration shapes", () => {
    expect(
      validateResumeDataPayload({
        name: "Avery Morgan",
        experience: [
          {
            title: "Product Lead",
            company: "Example",
            dates: "2024-present",
            highlights: ["Improved activation by 18%."],
            url: null,
          },
        ],
      }),
    ).toBeNull();
    expect(
      validatePageConfigPayload({
        variants: [],
        job_search_profile: { primary_goal: "land_interviews" },
      }),
    ).toBeNull();
  });

  it("rejects malformed resume arrays and unsupported root fields", () => {
    expect(validateResumeDataPayload({ name: "Avery", experience: "not-an-array" })).toMatch(
      /experience must be an array/i,
    );
    expect(validateResumeDataPayload({ name: "Avery", admin: true })).toMatch(
      /unsupported fields/i,
    );
  });

  it("rejects unsafe, deeply nested, and oversized page configuration", () => {
    const unsafe = JSON.parse('{"variants":[],"__proto__":{"polluted":true}}');
    expect(validatePageConfigPayload(unsafe)).toMatch(/unsupported fields|unsafe field/i);

    let nested: Record<string, unknown> = { value: "end" };
    for (let index = 0; index < 14; index += 1) {
      nested = { ats: nested };
    }
    expect(validatePageConfigPayload({ ats: nested })).toMatch(/nested too deeply/i);

    expect(
      validatePageConfigPayload({ ats: { value: "x".repeat(MAX_PAGE_CONFIG_BYTES) } }),
    ).toMatch(/too large/i);
  });
});
