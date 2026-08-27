import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PasswordChangeFeedback, {
  getPasswordFieldErrorProps,
  readPasswordChangeResponse,
} from "./PasswordChangeFeedback";

function response(ok: boolean, payload: unknown): Pick<Response, "json" | "ok"> {
  return {
    ok,
    json: async () => payload,
  };
}

describe("readPasswordChangeResponse", () => {
  it("associates verified reauthentication failures only with current password", async () => {
    const result = await readPasswordChangeResponse(
      response(false, {
        error: "The current password is incorrect.",
        code: "REAUTH_REQUIRED",
      }),
    );

    expect(result).toEqual({
      ok: false,
      text: "The current password is incorrect.",
      field: "current",
    });
    expect(getPasswordFieldErrorProps(result, "current")).toEqual({
      "aria-invalid": true,
      "aria-describedby": "password-form-error",
    });
    expect(getPasswordFieldErrorProps(result, "new")).toEqual({
      "aria-invalid": undefined,
      "aria-describedby": undefined,
    });
  });

  it("associates a rejected new password with the new-password field", async () => {
    await expect(
      readPasswordChangeResponse(
        response(false, {
          error: "Unable to update the password. Try a different password.",
        }),
      ),
    ).resolves.toEqual({
      ok: false,
      text: "Unable to update the password. Try a different password.",
      field: "new",
    });
  });

  it("keeps rate-limit, service, and malformed failures at form level", async () => {
    const rateLimited = await readPasswordChangeResponse(
      response(false, { error: "Too many password change requests. Please try again later." }),
    );
    const malformed = await readPasswordChangeResponse(response(true, { success: "yes" }));

    expect(rateLimited).toEqual({
      ok: false,
      text: "Too many password change requests. Please try again later.",
    });
    expect(malformed).toEqual({ ok: false, text: "Failed to update password. Try again." });
    expect(getPasswordFieldErrorProps(rateLimited, "current")["aria-invalid"]).toBeUndefined();
    expect(getPasswordFieldErrorProps(rateLimited, "new")["aria-invalid"]).toBeUndefined();
    expect(getPasswordFieldErrorProps(rateLimited, "confirm")["aria-invalid"]).toBeUndefined();
  });

  it("preserves local confirmation-field validation associations", () => {
    const mismatch = {
      ok: false as const,
      text: "Passwords do not match.",
      field: "confirm" as const,
    };

    expect(getPasswordFieldErrorProps(mismatch, "confirm")).toEqual({
      "aria-invalid": true,
      "aria-describedby": "password-form-error",
    });
    expect(getPasswordFieldErrorProps(mismatch, "current")["aria-invalid"]).toBeUndefined();
  });
});

describe("PasswordChangeFeedback", () => {
  it("announces a form-level service failure without claiming a field is invalid", () => {
    const markup = renderToStaticMarkup(
      <PasswordChangeFeedback
        message={{ ok: false, text: "Password changes are temporarily unavailable." }}
      />,
    );

    expect(markup).toContain('id="password-form-error"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Password changes are temporarily unavailable.");
  });

  it("announces success politely", () => {
    const markup = renderToStaticMarkup(
      <PasswordChangeFeedback message={{ ok: true, text: "Password updated successfully." }} />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Password updated successfully.");
  });
});
