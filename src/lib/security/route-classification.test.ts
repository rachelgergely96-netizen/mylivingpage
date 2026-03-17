import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ROUTE_TRUST_LEVELS,
  type RouteTrustLevel,
} from "@/lib/security/route-security";

const repoRoot = process.cwd();
const apiRoot = join(repoRoot, "src", "app", "api");

function walkRoutes(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const nextPath = join(root, entry);
    const stats = statSync(nextPath);
    if (stats.isDirectory()) {
      return walkRoutes(nextPath);
    }

    return entry === "route.ts" ? [nextPath] : [];
  });
}

describe("API route trust declarations", () => {
  it("requires every route to declare a supported trust level", () => {
    const failures: string[] = [];
    const singleTrustLevelRe =
      /export\s+const\s+routeTrustLevel\s*=\s*"([^"]+)";/;
    const mappedTrustLevelRe =
      /export\s+const\s+routeTrustLevel\s*=\s*\{([\s\S]*?)\};/;
    const mappedValueRe = /:\s*"([^"]+)"/g;

    for (const filePath of walkRoutes(apiRoot)) {
      const source = readFileSync(filePath, "utf8");
      const singleMatch = source.match(singleTrustLevelRe);
      const mappedMatch = source.match(mappedTrustLevelRe);

      if (!singleMatch && !mappedMatch) {
        failures.push(`${relative(repoRoot, filePath)} is missing routeTrustLevel`);
        continue;
      }

      const levels = singleMatch
        ? [singleMatch[1]]
        : Array.from((mappedMatch?.[1] ?? "").matchAll(mappedValueRe)).map(
            (match) => match[1],
          );

      if (levels.length === 0) {
        failures.push(`${relative(repoRoot, filePath)} declares no trust levels`);
        continue;
      }

      for (const declaredLevel of levels) {
        const level = declaredLevel as RouteTrustLevel;
        if (!ROUTE_TRUST_LEVELS.includes(level)) {
          failures.push(
            `${relative(repoRoot, filePath)} declares unsupported trust level ${declaredLevel}`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
