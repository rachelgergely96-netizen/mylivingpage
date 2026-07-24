import { describe, expect, it } from "vitest";
import { resolveAdminEmail } from "@/lib/admin";

describe("admin email configuration", () => {
  it("normalizes a configured server-only admin email", () => {
    expect(
      resolveAdminEmail({
        ADMIN_EMAIL: "  RACHELGERGELY96@GMAIL.COM ",
        NODE_ENV: "production",
      }),
    ).toBe("rachelgergely96@gmail.com");
  });

  it("fails closed when production has no configured admin", () => {
    expect(resolveAdminEmail({ NODE_ENV: "production" })).toBe("");
    expect(resolveAdminEmail({ ADMIN_EMAIL: "   ", NODE_ENV: "production" })).toBe("");
  });

  it("keeps the owner account available for local development", () => {
    expect(resolveAdminEmail({ NODE_ENV: "development" })).toBe(
      "rachelgergely96@gmail.com",
    );
  });
});
