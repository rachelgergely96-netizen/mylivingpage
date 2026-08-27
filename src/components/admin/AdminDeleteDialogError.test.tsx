import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminDeleteDialogError, {
  ADMIN_DELETE_ERROR_ID,
  claimAdminDeleteRequest,
  focusAdminDeleteFailure,
  restoreAdminDeleteFocus,
} from "@/components/admin/AdminDeleteDialogError";

describe("admin delete request integrity", () => {
  it("claims only one destructive request until the caller releases it", () => {
    const claim = { current: false };

    expect(claimAdminDeleteRequest(claim)).toBe(true);
    expect(claimAdminDeleteRequest(claim)).toBe(false);
    expect(claim.current).toBe(true);
  });

  it("returns failure focus to an enabled retry control", () => {
    const retry = { disabled: false, focus: vi.fn() };
    const input = { disabled: false, focus: vi.fn() };

    expect(focusAdminDeleteFailure(retry, input)).toBe(true);
    expect(retry.focus).toHaveBeenCalledOnce();
    expect(input.focus).not.toHaveBeenCalled();
  });

  it("falls back to confirmation input when retry is disabled", () => {
    const retry = { disabled: true, focus: vi.fn() };
    const input = { disabled: false, focus: vi.fn() };

    expect(focusAdminDeleteFailure(retry, input)).toBe(true);
    expect(retry.focus).not.toHaveBeenCalled();
    expect(input.focus).toHaveBeenCalledOnce();
  });

  it("restores close focus to search when a deleted trigger left the document", () => {
    const trigger = { isConnected: false, focus: vi.fn() };
    const search = { isConnected: true, focus: vi.fn() };

    expect(restoreAdminDeleteFocus(trigger, search)).toBe(true);
    expect(trigger.focus).not.toHaveBeenCalled();
    expect(search.focus).toHaveBeenCalledOnce();
  });
});

describe("AdminDeleteDialogError", () => {
  it("renders a persistent atomic alert", () => {
    const markup = renderToStaticMarkup(
      <AdminDeleteDialogError message="Account deletion is temporarily unavailable." />,
    );

    expect(markup).toContain(`id="${ADMIN_DELETE_ERROR_ID}"`);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).toContain("Account deletion is temporarily unavailable.");
  });
});
