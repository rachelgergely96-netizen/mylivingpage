import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const srcRoot = join(repoRoot, "src");

const CLIENT_ENV_RE = /process\.env\.([A-Z0-9_]+)/g;
const ALLOWED_CLIENT_ENV_PREFIX = "NEXT_PUBLIC_";

function walkFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const nextPath = join(root, entry);
    const stats = statSync(nextPath);
    if (stats.isDirectory()) {
      return walkFiles(nextPath);
    }

    if (!/\.(ts|tsx)$/.test(nextPath)) {
      return [];
    }

    return [nextPath];
  });
}

function getUseClientFiles() {
  return walkFiles(srcRoot).filter((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return /^\s*["']use client["'];/m.test(source);
  });
}

describe("client boundary security", () => {
  it("keeps server secrets out of client modules", () => {
    const failures: string[] = [];

    for (const filePath of getUseClientFiles()) {
      const source = readFileSync(filePath, "utf8");

      for (const match of source.matchAll(CLIENT_ENV_RE)) {
        const envName = match[1] ?? "";
        if (!envName.startsWith(ALLOWED_CLIENT_ENV_PREFIX)) {
          failures.push(
            `${relative(repoRoot, filePath)} references disallowed env var ${envName}`,
          );
        }
      }

      if (source.includes("createServiceRoleSupabaseClient")) {
        failures.push(
          `${relative(repoRoot, filePath)} references createServiceRoleSupabaseClient`,
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
