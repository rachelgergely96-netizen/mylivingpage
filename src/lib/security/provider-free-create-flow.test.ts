import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("provider-free resume creation", () => {
  it("keeps paid AI SDKs and provider keys out of the application", () => {
    const packageJson = JSON.parse(readRepoFile("package.json")) as {
      dependencies?: Record<string, string>;
    };
    const dependencyNames = Object.keys(packageJson.dependencies ?? {});

    expect(dependencyNames).not.toContain("@anthropic-ai/sdk");
    expect(readRepoFile(".env.example")).not.toContain("ANTHROPIC_API_KEY");
    expect(readRepoFile(".github/workflows/ci.yml")).not.toContain(
      "ANTHROPIC_API_KEY",
    );
  });

  it("keeps the guided builder disconnected from the retired parser", () => {
    const createSource = readRepoFile("src/app/(app)/create/page.tsx");
    const compatibilityRoute = readRepoFile(
      "src/app/api/generate/parse/route.ts",
    );

    expect(createSource).not.toContain("/api/generate/parse");
    expect(compatibilityRoute).toContain('code: "parsing_disabled"');
    expect(compatibilityRoute).not.toMatch(
      /@anthropic-ai|api\.anthropic\.com|messages\.create/,
    );
  });
});
