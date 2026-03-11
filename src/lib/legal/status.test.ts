import { describe, expect, it } from "vitest";
import { getLegalConfigIssues, hasLegalConfigIssues } from "@/lib/legal/status";

describe("legal config status helpers", () => {
  it("flags missing production legal values", () => {
    const issues = getLegalConfigIssues({} as NodeJS.ProcessEnv);

    expect(issues.map((issue) => issue.envKey)).toEqual([
      "NEXT_PUBLIC_LEGAL_COMPANY_NAME",
      "NEXT_PUBLIC_LEGAL_CONTACT_EMAIL",
      "NEXT_PUBLIC_LEGAL_MAILING_ADDRESS",
      "NEXT_PUBLIC_DMCA_AGENT_NAME",
      "NEXT_PUBLIC_DMCA_AGENT_EMAIL",
      "NEXT_PUBLIC_DMCA_AGENT_ADDRESS",
      "NEXT_PUBLIC_SECURITY_EMAIL",
    ]);
    expect(hasLegalConfigIssues({} as NodeJS.ProcessEnv)).toBe(true);
  });

  it("passes once all required legal values are present", () => {
    const env = {
      NEXT_PUBLIC_LEGAL_COMPANY_NAME: "MyLivingPage LLC",
      NEXT_PUBLIC_LEGAL_CONTACT_EMAIL: "legal@mylivingpage.com",
      NEXT_PUBLIC_LEGAL_MAILING_ADDRESS: "123 Main St, Wilmington, DE 19801",
      NEXT_PUBLIC_DMCA_AGENT_NAME: "MyLivingPage DMCA Agent",
      NEXT_PUBLIC_DMCA_AGENT_EMAIL: "dmca@mylivingpage.com",
      NEXT_PUBLIC_DMCA_AGENT_ADDRESS: "123 Main St, Wilmington, DE 19801",
      NEXT_PUBLIC_SECURITY_EMAIL: "security@mylivingpage.com",
    };

    expect(getLegalConfigIssues(env as unknown as NodeJS.ProcessEnv)).toEqual([]);
    expect(hasLegalConfigIssues(env as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
