import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PublishPageButton from "@/components/PublishPageButton";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

describe("PublishPageButton", () => {
  it("does not announce or emit publish success before a confirmed request", () => {
    const markup = renderToStaticMarkup(
      <PublishPageButton pageId="page-1" label="Republish" />,
    );

    expect(markup).toContain("Republish");
    expect(markup).toContain("data-dashboard-publish-status");
    expect(markup).not.toContain("Page published");
    expect(markup).not.toContain("page.publish.confirmed");
    expect(markup).not.toContain("data-motion-target=");
  });
});
