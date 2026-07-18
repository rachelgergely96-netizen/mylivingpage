import { describe, expect, it } from "vitest";
import {
  getLegalNavItems,
  isPolicyAvailableOnSite,
} from "@/lib/legal/site-config";

describe("MyLivingPage legal navigation", () => {
  it("publishes the Cookie Policy and exposes it in legal navigation", () => {
    expect(isPolicyAvailableOnSite("mylivingpage", "cookies")).toBe(true);
    expect(getLegalNavItems("mylivingpage")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/cookies", label: "Cookie Policy" }),
      ]),
    );
  });
});
