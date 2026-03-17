import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const srcRoot = join(repoRoot, "src");
const clientEnvRe = /process\.env\.([A-Z0-9_]+)/g;
const failures = [];

function walkFiles(root) {
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

for (const filePath of walkFiles(srcRoot)) {
  const source = readFileSync(filePath, "utf8");
  if (!/^\s*["']use client["'];/m.test(source)) {
    continue;
  }

  for (const match of source.matchAll(clientEnvRe)) {
    const envName = match[1] ?? "";
    if (!envName.startsWith("NEXT_PUBLIC_")) {
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

if (failures.length) {
  console.error("Client security boundary check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Client security boundary check passed.");
