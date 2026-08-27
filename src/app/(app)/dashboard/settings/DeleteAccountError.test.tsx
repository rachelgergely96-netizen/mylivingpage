import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DeleteAccountError, {
  DELETE_ACCOUNT_ERROR_ID,
  focusDeleteFailureControl,
} from "./DeleteAccountError";

describe("focusDeleteFailureControl", () => {
  it("returns focus to the enabled destructive retry after failure", () => {
    const retry = { disabled: false, focus: vi.fn() };
    const fallback = { disabled: false, focus: vi.fn() };

    expect(focusDeleteFailureControl(retry, fallback)).toBe(true);
    expect(retry.focus).toHaveBeenCalledOnce();
    expect(fallback.focus).not.toHaveBeenCalled();
  });

  it("uses the confirmation input when the retry became disabled", () => {
    const retry = { disabled: true, focus: vi.fn() };
    const fallback = { disabled: false, focus: vi.fn() };

    expect(focusDeleteFailureControl(retry, fallback)).toBe(true);
    expect(retry.focus).not.toHaveBeenCalled();
    expect(fallback.focus).toHaveBeenCalledOnce();
  });

  it("uses the confirmation input when the retry control is unavailable", () => {
    const fallback = { disabled: false, focus: vi.fn() };

    expect(focusDeleteFailureControl(null, fallback)).toBe(true);
    expect(fallback.focus).toHaveBeenCalledOnce();
  });

  it("does not move focus to a disabled control", () => {
    const retry = { disabled: true, focus: vi.fn() };
    const fallback = { disabled: true, focus: vi.fn() };

    expect(focusDeleteFailureControl(retry, fallback)).toBe(false);
    expect(retry.focus).not.toHaveBeenCalled();
    expect(fallback.focus).not.toHaveBeenCalled();
  });
});

describe("DeleteAccountError", () => {
  it("keeps the failed request message in an atomic alert", () => {
    const markup = renderToStaticMarkup(
      <DeleteAccountError message="Account deletion is temporarily unavailable." />,
    );

    expect(markup).toContain(`id="${DELETE_ACCOUNT_ERROR_ID}"`);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).toContain("Account deletion is temporarily unavailable.");
  });
});
