import { describe, expect, it } from "vitest";
import {
  getSupabaseCookieOptions,
  normalizeHostname,
} from "@/lib/supabase/cookies";

describe("supabase cookie options", () => {
  it("shares auth cookies across the production apex and www hosts", () => {
    expect(getSupabaseCookieOptions("mylivingpage.com")).toEqual({
      domain: ".mylivingpage.com",
    });
    expect(getSupabaseCookieOptions("www.mylivingpage.com")).toEqual({
      domain: ".mylivingpage.com",
    });
    expect(getSupabaseCookieOptions("https://www.mylivingpage.com/login")).toEqual({
      domain: ".mylivingpage.com",
    });
  });

  it("keeps localhost and preview deployments host-only", () => {
    expect(getSupabaseCookieOptions("localhost")).toBeUndefined();
    expect(getSupabaseCookieOptions("127.0.0.1:3000")).toBeUndefined();
    expect(getSupabaseCookieOptions("mylivingpage-git-auth-fix-rache.vercel.app")).toBeUndefined();
  });

  it("normalizes hosts and URLs before checking cookie policy", () => {
    expect(normalizeHostname("WWW.MyLivingPage.com:443")).toBe("www.mylivingpage.com");
    expect(normalizeHostname("https://mylivingpage.com/callback")).toBe("mylivingpage.com");
  });
});
