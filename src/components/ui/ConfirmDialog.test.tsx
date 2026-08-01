import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const baseProps = {
  title: "Delete this page?",
  body: "This permanently removes the page.",
  confirmLabel: "Delete page",
  onConfirm: () => {},
  onClose: () => {},
};

// In the browser the dialog renders through createPortal(document.body); the
// node test environment has no document, so renderToStaticMarkup exercises the
// SSR fallback branch, which returns the same overlay markup inline.
describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    expect(renderToStaticMarkup(<ConfirmDialog {...baseProps} open={false} />)).toBe("");
  });

  it("renders alertdialog semantics with labelled title and description when open", () => {
    const markup = renderToStaticMarkup(<ConfirmDialog {...baseProps} open />);

    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("aria-labelledby=");
    expect(markup).toContain("aria-describedby=");
    expect(markup).toContain("Delete this page?");
    expect(markup).toContain("This permanently removes the page.");
    expect(markup).toContain("Delete page");
    expect(markup).toContain("Cancel");
  });

  it("uses danger treatment only for destructive confirmations", () => {
    const neutral = renderToStaticMarkup(<ConfirmDialog {...baseProps} open />);
    const destructive = renderToStaticMarkup(<ConfirmDialog {...baseProps} open destructive />);

    expect(neutral).toContain("site-button-primary");
    expect(neutral).not.toContain("site-button-danger");
    expect(destructive).toContain("site-button-danger");
    expect(destructive).toContain("border-site-danger");
  });

  it("disables both actions while loading", () => {
    const markup = renderToStaticMarkup(<ConfirmDialog {...baseProps} open loading />);

    expect((markup.match(/disabled=""/g) ?? []).length).toBe(2);
  });

  it("renders a persistent role=alert error inside the dialog", () => {
    const markup = renderToStaticMarkup(
      <ConfirmDialog {...baseProps} open error="Deletion failed. Check your password." />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Deletion failed. Check your password.");
  });
});
